import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Encargue, EstadoEncargue } from './entities/encargue.entity';
import { DetalleEncargue } from './entities/detalle-encargue.entity';
import { Variedad } from '../variedades/entities/variedad.entity';
import { CreateEncargueDto, UpdateEncargueDto } from './dto/create-encargue.dto';
import { precioObligatorio, UNIDADES_POR_MODO } from '../common/precios';
import { MAX_INT } from '../common/validaciones';
import { guardarVenta } from '../ventas/guardar-venta';
import { Venta } from '../ventas/entities/venta.entity';

// A qué estados se puede pasar desde cada uno: un paso para adelante o uno para atrás.
// "entregado" es final porque ya generó una venta (para deshacerlo, se anula la venta).
const TRANSICIONES: Record<EstadoEncargue, EstadoEncargue[]> = {
  pendiente: ['listo'],
  listo: ['pendiente', 'entregado'],
  entregado: [],
};

const RELACIONES = { detalles: { variedad: true } };

@Injectable()
export class EncarguesService {
  constructor(
    @InjectRepository(Encargue)
    private readonly encarguesRepository: Repository<Encargue>,
    @InjectRepository(DetalleEncargue)
    private readonly detallesRepository: Repository<DetalleEncargue>,
    @InjectRepository(Variedad)
    private readonly variedadesRepository: Repository<Variedad>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateEncargueDto) {
    // Verifico todas las variedades antes de guardar nada.
    const ids = [...new Set(dto.detalles.map((d) => d.variedadId))];
    const existentes = await this.variedadesRepository.findBy({ id: In(ids) });
    const faltante = ids.find((id) => !existentes.some((v) => v.id === id));
    if (faltante !== undefined) {
      throw new NotFoundException(`La variedad con ID ${faltante} no existe.`);
    }

    // Cabecera + renglones juntos: si fallan los renglones, no queda un encargue vacío.
    const id = await this.dataSource.transaction(async (manager) => {
      const encargue = await manager.save(Encargue, {
        cliente: dto.cliente,
        telefono: dto.telefono,
      });
      await manager.save(
        DetalleEncargue,
        dto.detalles.map((d) => ({
          encargueId: encargue.id,
          variedadId: d.variedadId,
          modo: d.modo,
          cantidad: d.cantidad * UNIDADES_POR_MODO[d.modo], // a unidades
        })),
      );
      return encargue.id;
    });
    return this.findOne(id);
  }

  findAll(estado?: EstadoEncargue) {
    return this.encarguesRepository.find({
      where: estado ? { estado } : {},
      relations: RELACIONES,
      order: { fecha: 'DESC', id: 'DESC' },
    });
  }

  async findOne(id: number) {
    const encargue =
      id > MAX_INT
        ? null
        : await this.encarguesRepository.findOne({
            where: { id },
            relations: RELACIONES,
          });
    if (!encargue) {
      throw new NotFoundException(`El encargue con ID ${id} no existe.`);
    }
    return encargue;
  }

  async update(id: number, dto: UpdateEncargueDto) {
    const encargue = await this.findOne(id);
    if (encargue.estado === 'entregado') {
      throw new ConflictException('Un encargue entregado no se puede editar.');
    }
    await this.encarguesRepository.update(id, dto);
    return this.findOne(id);
  }

  async cambiarEstado(id: number, nuevo: EstadoEncargue) {
    const encargue = await this.findOne(id);
    if (!TRANSICIONES[encargue.estado].includes(nuevo)) {
      throw new ConflictException(
        `No se puede pasar de "${encargue.estado}" a "${nuevo}".`,
      );
    }

    if (nuevo !== 'entregado') {
      await this.encarguesRepository.update(id, { estado: nuevo });
      return { encargue: await this.findOne(id), venta: null };
    }

    // Entregar: marcar entregado + crear la venta con los precios DE HOY, todo junto.
    // No se descuenta stock: lo encargado se hizo aparte para este cliente.
    const ventaId = await this.dataSource.transaction(async (manager) => {
      // Update condicional: si dos pedidos intentan entregar a la vez, solo uno
      // encuentra el encargue todavía en "listo". El otro no genera una venta doble.
      const r = await manager.update(
        Encargue,
        { id, estado: 'listo' },
        { estado: 'entregado' },
      );
      if (r.affected === 0) {
        throw new ConflictException('El encargue ya no está en "listo".');
      }

      const renglones = [];
      for (const d of encargue.detalles) {
        const variedad = await manager.findOneOrFail(Variedad, {
          where: { id: d.variedadId },
          relations: { categoria: true },
        });
        const precio = precioObligatorio(variedad, d.modo); // 400 si no tiene precio
        renglones.push({
          variedadId: d.variedadId,
          modo: d.modo,
          cantidad: d.cantidad,
          precioUnitario: precio,
          subtotal: precio * (d.cantidad / UNIDADES_POR_MODO[d.modo]),
        });
      }
      return guardarVenta(manager, renglones, encargue.cliente, encargue.id);
    });

    // Misma forma que en los otros estados: { encargue, venta }.
    const venta = await buscarVenta(this.dataSource, ventaId);
    return { encargue: await this.findOne(id), venta };
  }

  // Cancelar un encargue que todavía no se entregó.
  async remove(id: number) {
    const encargue = await this.findOne(id);
    if (encargue.estado === 'entregado') {
      throw new ConflictException(
        'Un encargue entregado no se puede eliminar; anulá la venta primero.',
      );
    }
    await this.encarguesRepository.delete(id); // renglones por CASCADE
    return { message: `El encargue con ID ${id} fue cancelado.` };
  }

  // "Por hacer": no es una tabla, es una consulta sobre los renglones de encargues pendientes.
  async porHacer() {
    // 1) Subtotal por variedad con GROUP BY + SUM. En SQL sería:
    //    SELECT v.id, v.nombre, SUM(d.cantidad) FROM detalle_encargue d
    //    JOIN encargue e ON ... JOIN variedad v ON ...
    //    WHERE e.estado = 'pendiente' GROUP BY v.id, v.nombre
    const filas = await this.detallesRepository
      .createQueryBuilder('d')
      .innerJoin('d.encargue', 'e')
      .innerJoin('d.variedad', 'v')
      .select('v.id', 'variedadId')
      .addSelect('v.nombre', 'nombre')
      .addSelect('SUM(d.cantidad)', 'subtotal')
      .where('e.estado = :estado', { estado: 'pendiente' })
      .groupBy('v.id')
      .addGroupBy('v.nombre')
      .orderBy('v.nombre', 'ASC')
      .getRawMany<{ variedadId: number; nombre: string; subtotal: string }>();

    // 2) El detalle de cada encargue (cliente y cantidad) para mostrar debajo de cada variedad.
    const detalles = await this.detallesRepository.find({
      where: { encargue: { estado: 'pendiente' } },
      relations: { encargue: true },
      order: { encargue: { fecha: 'ASC' } },
    });

    const variedades = filas.map((f) => ({
      variedadId: f.variedadId,
      nombre: f.nombre,
      // SUM devuelve bigint y el driver lo pasa como texto para no perder precisión.
      subtotal: Number(f.subtotal),
      encargues: detalles
        .filter((d) => d.variedadId === f.variedadId)
        .map((d) => ({
          encargueId: d.encargueId,
          cliente: d.encargue.cliente,
          telefono: d.encargue.telefono,
          fecha: d.encargue.fecha,
          modo: d.modo,
          cantidad: d.cantidad,
        })),
    }));
    const total = variedades.reduce((suma, v) => suma + v.subtotal, 0);
    return { variedades, total };
  }
}

// Trae la venta recién creada con sus renglones.
function buscarVenta(dataSource: DataSource, id: number) {
  return dataSource.getRepository(Venta).findOne({
    where: { id },
    relations: { detalles: { variedad: true } },
  });
}

// Para que el controller valide el estado recibido.
export function esEstado(valor: unknown): valor is EstadoEncargue {
  return valor === 'pendiente' || valor === 'listo' || valor === 'entregado';
}

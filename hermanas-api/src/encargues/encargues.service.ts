import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Encargue, EstadoEncargue } from './entities/encargue.entity';
import { DetalleEncargue } from './entities/detalle-encargue.entity';
import { Variedad } from '../variedades/entities/variedad.entity';
import { Presentacion } from '../presentaciones/entities/presentacion.entity';
import { CreateEncargueDto, UpdateEncargueDto } from './dto/create-encargue.dto';
import { precioObligatorio } from '../common/precios';
import { MAX_INT } from '../common/validaciones';
import { guardarVenta, RenglonVenta } from '../ventas/guardar-venta';
import { Venta } from '../ventas/entities/venta.entity';

// A qué estados se puede pasar desde cada uno: un paso para adelante o uno para atrás.
// "entregado" es final porque ya generó una venta (para deshacerlo, se anula la venta).
const TRANSICIONES: Record<EstadoEncargue, EstadoEncargue[]> = {
  pendiente: ['listo'],
  listo: ['pendiente', 'entregado'],
  entregado: [],
};

const RELACIONES = { detalles: { variedad: true, presentacion: true } };

@Injectable()
export class EncarguesService {
  constructor(
    @InjectRepository(Encargue)
    private readonly encarguesRepository: Repository<Encargue>,
    @InjectRepository(DetalleEncargue)
    private readonly detallesRepository: Repository<DetalleEncargue>,
    @InjectRepository(Variedad)
    private readonly variedadesRepository: Repository<Variedad>,
    @InjectRepository(Presentacion)
    private readonly presentacionesRepository: Repository<Presentacion>,
    private readonly dataSource: DataSource,
  ) {}

  // Alta manual desde la pantalla Encargues: no toca el stock (todo por hacer).
  async create(dto: CreateEncargueDto) {
    // Verifico variedades y presentaciones antes de guardar nada.
    const variedades = await this.variedadesRepository.findBy({
      id: In([...new Set(dto.detalles.map((d) => d.variedadId))]),
    });
    const presentaciones = await this.presentacionesRepository.findBy({
      id: In([...new Set(dto.detalles.map((d) => d.presentacionId))]),
    });
    const renglones = dto.detalles.map((d) => {
      const variedad = variedades.find((v) => v.id === d.variedadId);
      if (!variedad) throw new NotFoundException(`La variedad con ID ${d.variedadId} no existe.`);
      const presentacion = presentaciones.find((p) => p.id === d.presentacionId);
      if (!presentacion || presentacion.categoriaId !== variedad.categoriaId) {
        throw new BadRequestException(
          `La presentación ${d.presentacionId} no corresponde a "${variedad.nombre}".`,
        );
      }
      return {
        variedadId: variedad.id,
        presentacionId: presentacion.id,
        unidadesPorPresentacion: presentacion.unidades,
        cantidad: d.cantidad * presentacion.unidades, // a unidades de stock
        cantidadPreparada: 0,
      };
    });

    // Cabecera + renglones juntos: si fallan los renglones, no queda un encargue vacío.
    const id = await this.dataSource.transaction(async (manager) => {
      const encargue = await manager.save(Encargue, {
        cliente: dto.cliente,
        telefono: dto.telefono,
        retiro: dto.retiro ?? null,
      });
      await manager.save(
        DetalleEncargue,
        renglones.map((r) => ({ ...r, encargueId: encargue.id })),
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

  // "listo" significa que está TODO preparado. No hace falta tocar cantidadPreparada:
  // el estado ya lo dice, y si vuelve a "pendiente" quedan las reservadas al principio.
  async cambiarEstado(id: number, nuevo: EstadoEncargue) {
    const encargue = await this.findOne(id);
    if (!TRANSICIONES[encargue.estado].includes(nuevo)) {
      throw new ConflictException(
        `No se puede pasar de "${encargue.estado}" a "${nuevo}".`,
      );
    }

    if (nuevo !== 'entregado') {
      // Condicional: solo si sigue en el estado que leí. Si en el medio lo cancelaron
      // o lo cambiaron desde otro dispositivo, no piso nada.
      const r = await this.encarguesRepository.update(
        { id, estado: encargue.estado },
        { estado: nuevo },
      );
      if (r.affected === 0) {
        throw new ConflictException('El encargue cambió mientras tanto; recargá la lista.');
      }
      return { encargue: await this.findOne(id), venta: null };
    }

    // Entregar: marcar entregado + crear la venta con los precios DE HOY, todo junto.
    // No se toca el stock: lo reservado ya se descontó al crear el encargue.
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

      const renglones: RenglonVenta[] = [];
      for (const d of encargue.detalles) {
        if (!d.presentacion) {
          throw new ConflictException(
            `La presentación de "${d.variedad.nombre}" ya no existe; no se puede calcular el precio.`,
          );
        }
        const variedad = await manager.findOneOrFail(Variedad, {
          where: { id: d.variedadId },
          relations: { categoria: true, precios: true },
        });
        const precio = precioObligatorio(variedad, d.presentacion); // 400 si no tiene precio
        renglones.push({
          variedadId: d.variedadId,
          presentacionId: d.presentacion.id,
          presentacionNombre: d.presentacion.nombre,
          unidadesPorPresentacion: d.unidadesPorPresentacion,
          cantidad: d.cantidad,
          precioUnitario: precio,
          // Con la copia de unidades: 8 porciones encargadas de a 4 = 2 tartas enteras.
          subtotal: precio * Math.ceil(d.cantidad / d.unidadesPorPresentacion),
        });
      }
      return guardarVenta(manager, renglones, encargue.cliente, encargue.id);
    });

    const venta = await this.dataSource.getRepository(Venta).findOne({
      where: { id: ventaId },
      relations: { detalles: { variedad: true } },
    });
    return { encargue: await this.findOne(id), venta };
  }

  // Cancelar un encargue que todavía no se entregó. Lo ya hecho vuelve al stock:
  //   pendiente → las reservadas (cantidadPreparada)
  //   listo     → todo (está todo preparado)
  //
  // Todo pasa dentro de UNA transacción y con el encargue BLOQUEADO (SELECT ... FOR UPDATE):
  // - Si llegan dos cancelaciones a la vez, la segunda espera; cuando le toca, el encargue
  //   ya no existe → 404, sin devolver stock dos veces.
  // - El estado se lee bloqueado, así nadie lo marca "listo" o lo entrega en el medio
  //   (esos cambios esperan a que termine la cancelación).
  async remove(id: number) {
    if (id > MAX_INT) throw new NotFoundException(`El encargue con ID ${id} no existe.`);
    const devueltas = await this.dataSource.transaction(async (manager) => {
      const encargue = await manager.findOne(Encargue, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!encargue) throw new NotFoundException(`El encargue con ID ${id} no existe.`);
      if (encargue.estado === 'entregado') {
        throw new ConflictException(
          'Un encargue entregado no se puede eliminar; anulá la venta primero.',
        );
      }
      // Los renglones se leen aparte: FOR UPDATE no se puede combinar con un LEFT JOIN.
      const detalles = await manager.findBy(DetalleEncargue, { encargueId: id });

      // Segunda red de seguridad: si por algún motivo ya no estaba, no se devuelve nada.
      const borrado = await manager.delete(Encargue, id); // renglones por CASCADE
      if (borrado.affected === 0) {
        throw new NotFoundException(`El encargue con ID ${id} ya fue cancelado.`);
      }

      let total = 0;
      for (const d of detalles) {
        const vuelven = encargue.estado === 'listo' ? d.cantidad : d.cantidadPreparada;
        if (vuelven > 0) {
          await manager.increment(Variedad, { id: d.variedadId }, 'stock', vuelven);
          total += vuelven;
        }
      }
      return total;
    });
    return {
      message:
        `El encargue con ID ${id} fue cancelado.` +
        (devueltas > 0 ? ` Volvieron ${devueltas} unidades al stock.` : ''),
    };
  }

  // "Por hacer": no es una tabla, es una consulta sobre los encargues pendientes.
  // Solo cuenta lo que falta preparar: cantidad - cantidadPreparada.
  async porHacer() {
    // 1) Subtotal por variedad con GROUP BY + SUM. En SQL sería:
    //    SELECT v.id, v.nombre, SUM(d.cantidad - d.cantidad_preparada)
    //    FROM detalle_encargue d JOIN encargue e ... JOIN variedad v ...
    //    WHERE e.estado = 'pendiente' GROUP BY v.id, v.nombre
    //    HAVING SUM(...) > 0      ← HAVING es el WHERE de después de agrupar
    const filas = await this.detallesRepository
      .createQueryBuilder('d')
      .innerJoin('d.encargue', 'e')
      .innerJoin('d.variedad', 'v')
      .select('v.id', 'variedadId')
      .addSelect('v.nombre', 'nombre')
      .addSelect('SUM(d.cantidad - d.cantidadPreparada)', 'subtotal')
      .where('e.estado = :estado', { estado: 'pendiente' })
      .groupBy('v.id')
      .addGroupBy('v.nombre')
      .having('SUM(d.cantidad - d.cantidadPreparada) > 0')
      .orderBy('v.nombre', 'ASC')
      .getRawMany<{ variedadId: number; nombre: string; subtotal: string }>();

    // 2) El detalle de cada encargue para mostrar debajo de cada variedad.
    const detalles = await this.detallesRepository.find({
      where: { encargue: { estado: 'pendiente' } },
      relations: { encargue: true, presentacion: true },
      order: { encargue: { fecha: 'ASC' } },
    });

    const variedades = filas.map((f) => ({
      variedadId: f.variedadId,
      nombre: f.nombre,
      // SUM devuelve bigint y el driver lo pasa como texto para no perder precisión.
      subtotal: Number(f.subtotal),
      encargues: detalles
        .filter((d) => d.variedadId === f.variedadId && d.cantidad > d.cantidadPreparada)
        .map((d) => ({
          encargueId: d.encargueId,
          cliente: d.encargue.cliente,
          telefono: d.encargue.telefono,
          retiro: d.encargue.retiro,
          fecha: d.encargue.fecha,
          presentacion: d.presentacion?.nombre ?? '',
          cantidad: d.cantidad,
          preparada: d.cantidadPreparada,
          faltan: d.cantidad - d.cantidadPreparada,
        })),
    }));
    const total = variedades.reduce((suma, v) => suma + v.subtotal, 0);
    return { variedades, total };
  }
}

// Para que el controller valide el estado recibido.
export function esEstado(valor: unknown): valor is EstadoEncargue {
  return valor === 'pendiente' || valor === 'listo' || valor === 'entregado';
}

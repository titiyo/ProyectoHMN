import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  EntityManager,
  FindOptionsWhere,
  LessThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Venta } from './entities/venta.entity';
import { Variedad } from '../variedades/entities/variedad.entity';
import { Presentacion } from '../presentaciones/entities/presentacion.entity';
import { Encargue } from '../encargues/entities/encargue.entity';
import { DetalleEncargue } from '../encargues/entities/detalle-encargue.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { RenglonPedido } from '../common/detalles';
import { esPorEncargue, precioObligatorio } from '../common/precios';
import { MAX_INT } from '../common/validaciones';
import { guardarVenta, RenglonVenta } from './guardar-venta';

const RELACIONES_VENTA = { detalles: { variedad: true } };

// Un renglón del pedido ya resuelto contra la base.
interface Linea {
  variedad: Variedad;
  presentacion: Presentacion;
  cantidad: number; // en presentaciones (2 docenas = 2)
  pedidas: number; // en unidades de stock (2 docenas = 24)
}

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventasRepository: Repository<Venta>,
    // DataSource es la conexión a la base; con ella se abren transacciones.
    private readonly dataSource: DataSource,
  ) {}

  // Busca variedad y presentación de cada renglón y verifica que vayan juntas.
  private async resolverLineas(manager: EntityManager, detalles: RenglonPedido[]) {
    const lineas: Linea[] = [];
    for (const item of detalles) {
      const variedad = await manager.findOne(Variedad, {
        where: { id: item.variedadId },
        relations: { categoria: true, precios: true },
      });
      if (!variedad) {
        throw new NotFoundException(`La variedad con ID ${item.variedadId} no existe.`);
      }
      const presentacion = await manager.findOneBy(Presentacion, { id: item.presentacionId });
      if (!presentacion || presentacion.categoriaId !== variedad.categoriaId) {
        throw new BadRequestException(
          `La presentación ${item.presentacionId} no corresponde a "${variedad.nombre}".`,
        );
      }
      lineas.push({
        variedad,
        presentacion,
        cantidad: item.cantidad,
        pedidas: item.cantidad * presentacion.unidades,
      });
    }
    return lineas;
  }

  // Bloquea las filas de stock (SELECT ... FOR UPDATE) y devuelve cuánto hay de cada una.
  // Otra venta que quiera las mismas variedades espera a que esta transacción termine.
  // Se bloquean en orden de id: si dos ventas bloquearan en distinto orden, cada una
  // podría quedarse esperando a la otra para siempre ("deadlock").
  private async bloquearStock(manager: EntityManager, lineas: Linea[]) {
    const ids = [...new Set(lineas.map((l) => l.variedad.id))].sort((a, b) => a - b);
    const stock = new Map<number, number>();
    for (const id of ids) {
      const fila = await manager.findOneOrFail(Variedad, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      stock.set(id, fila.stock);
    }
    return stock;
  }

  // Registrar una venta: TODO O NADA (transaction = si algo falla, ROLLBACK).
  //
  // - Si todo alcanza: venta normal, se descuenta el stock y se cobra ahora.
  // - Si algo no alcanza (o es por encargue): TODO el pedido pasa a un encargue
  //   (un solo ticket, se cobra al entregar). Sin "faltante" elegido → 409.
  //     faltante 'reservar': lo que hay en stock se descuenta y queda como preparado.
  //     faltante 'hacer':    no se toca el stock; se prepara todo.
  async create(dto: CreateVentaDto) {
    const ids = await this.dataSource.transaction(async (manager) => {
      const lineas = await this.resolverLineas(manager, dto.detalles);
      const stock = await this.bloquearStock(manager, lineas);

      // ¿Alcanza todo? Se va restando por si la misma variedad viene en dos renglones.
      const restante = new Map(stock);
      const problemas: string[] = [];
      for (const l of lineas) {
        const hay = restante.get(l.variedad.id)!;
        if (esPorEncargue(l.variedad)) {
          problemas.push(`"${l.variedad.nombre}" se elabora por encargue`);
        } else if (hay < l.pedidas) {
          problemas.push(`"${l.variedad.nombre}": hay ${hay}, se piden ${l.pedidas}`);
        } else {
          restante.set(l.variedad.id, hay - l.pedidas);
        }
      }

      // Caso normal: venta en el momento.
      if (problemas.length === 0) {
        const renglones: RenglonVenta[] = [];
        for (const l of lineas) {
          const precio = precioObligatorio(l.variedad, l.presentacion);
          await manager.decrement(Variedad, { id: l.variedad.id }, 'stock', l.pedidas);
          renglones.push({
            variedadId: l.variedad.id,
            presentacionId: l.presentacion.id,
            presentacionNombre: l.presentacion.nombre,
            unidadesPorPresentacion: l.presentacion.unidades,
            cantidad: l.pedidas,
            precioUnitario: precio,
            subtotal: precio * l.cantidad,
          });
        }
        const ventaId = await guardarVenta(manager, renglones, dto.cliente ?? null);
        return { ventaId, encargueId: null };
      }

      // Algo no alcanza y no se eligió qué hacer: 409 y no se guarda nada.
      // El front muestra las dos opciones y vuelve a mandar el pedido con "faltante".
      if (!dto.faltante) {
        throw new ConflictException(
          `No alcanza el stock (${problemas.join('; ')}). Elegí reservar lo que hay o mandar a hacer todo.`,
        );
      }

      // Todo el pedido pasa a encargue.
      const encargue = await manager.save(Encargue, {
        cliente: dto.cliente!, // el controller exige cliente y telefono con "faltante"
        telefono: dto.telefono!,
      });
      const disponible = new Map(stock);
      for (const l of lineas) {
        let preparada = 0;
        // También en variedades por encargue: si tienen stock (ej. de un encargue
        // cancelado ya preparado), ese stock está hecho y se aprovecha.
        if (dto.faltante === 'reservar') {
          preparada = Math.min(l.pedidas, disponible.get(l.variedad.id)!);
          disponible.set(l.variedad.id, disponible.get(l.variedad.id)! - preparada);
          if (preparada > 0) {
            await manager.decrement(Variedad, { id: l.variedad.id }, 'stock', preparada);
          }
        }
        await manager.save(DetalleEncargue, {
          encargueId: encargue.id,
          variedadId: l.variedad.id,
          presentacionId: l.presentacion.id,
          unidadesPorPresentacion: l.presentacion.unidades,
          cantidad: l.pedidas,
          cantidadPreparada: preparada,
        });
      }
      return { ventaId: null, encargueId: encargue.id };
    });

    // Respuesta siempre con la misma forma; el que no se creó viene en null.
    return {
      venta: ids.ventaId ? await this.findOne(ids.ventaId) : null,
      encargue: ids.encargueId
        ? await this.dataSource.getRepository(Encargue).findOne({
            where: { id: ids.encargueId },
            relations: { detalles: { variedad: true, presentacion: true } },
          })
        : null,
    };
  }

  // desde/hasta ya vienen como Date desde el controller. "hasta" es exclusivo
  // (el controller le suma un día), así "hasta 24-10-2026" incluye todo el 24.
  findAll(desde?: Date, hasta?: Date) {
    let fecha: FindOptionsWhere<Venta>['fecha'];
    if (desde && hasta) fecha = Between(desde, new Date(hasta.getTime() - 1));
    else if (desde) fecha = MoreThanOrEqual(desde);
    else if (hasta) fecha = LessThan(hasta);

    return this.ventasRepository.find({
      where: fecha ? { fecha } : {},
      relations: RELACIONES_VENTA,
      order: { fecha: 'DESC', id: 'DESC' },
    });
  }

  async findOne(id: number) {
    const venta =
      id > MAX_INT
        ? null
        : await this.ventasRepository.findOne({
            where: { id },
            relations: RELACIONES_VENTA,
          });
    if (!venta) {
      throw new NotFoundException(`La venta con ID ${id} no existe.`);
    }
    return venta;
  }

  // Anular, también todo o nada.
  // - Venta de mostrador: devuelve las unidades al stock.
  // - Venta de un encargue: no toca stock; el encargue vuelve a "listo".
  //
  // Si llegan dos anulaciones de la misma venta a la vez, solo una puede devolver el stock.
  // Por eso el orden es: leer → BORRAR → comprobar que se borró → recién ahí devolver.
  // El DELETE bloquea la fila: la segunda anulación espera a que la primera termine,
  // y cuando le toca la venta ya no existe → borra 0 filas → 404 y su transacción se
  // deshace sin haber tocado el stock.
  async remove(id: number) {
    if (id > MAX_INT) throw new NotFoundException(`La venta con ID ${id} no existe.`);
    const encargueId = await this.dataSource.transaction(async (manager) => {
      const venta = await manager.findOne(Venta, {
        where: { id },
        relations: { detalles: true },
      });
      if (!venta) throw new NotFoundException(`La venta con ID ${id} no existe.`);

      // Los renglones se borran solos por el onDelete: 'CASCADE' (ya los tengo leídos).
      const borrado = await manager.delete(Venta, id);
      if (borrado.affected === 0) {
        throw new NotFoundException(`La venta con ID ${id} ya fue anulada.`);
      }

      if (venta.encargueId) {
        await manager.update(Encargue, venta.encargueId, { estado: 'listo' });
      } else {
        for (const detalle of venta.detalles) {
          await manager.increment(Variedad, { id: detalle.variedadId }, 'stock', detalle.cantidad);
        }
      }
      return venta.encargueId;
    });
    return {
      message: encargueId
        ? `La venta con ID ${id} fue anulada y el encargue ${encargueId} volvió a "listo".`
        : `La venta con ID ${id} fue anulada y el stock devuelto.`,
    };
  }
}

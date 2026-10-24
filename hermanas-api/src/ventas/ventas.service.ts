import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  FindOptionsWhere,
  LessThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Venta } from './entities/venta.entity';
import { Variedad } from '../variedades/entities/variedad.entity';
import { Encargue } from '../encargues/entities/encargue.entity';
import { DetalleEncargue } from '../encargues/entities/detalle-encargue.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { precioObligatorio, UNIDADES_POR_MODO } from '../common/precios';
import { MAX_INT } from '../common/validaciones';
import { guardarVenta, RenglonVenta } from './guardar-venta';

const RELACIONES_VENTA = { detalles: { variedad: true } };

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventasRepository: Repository<Venta>,
    // DataSource es la conexión a la base; con ella se abren transacciones.
    private readonly dataSource: DataSource,
  ) {}

  // Registrar una venta: TODO O NADA.
  // Dentro de transaction() todo usa el mismo "manager". Si algo tira una excepción,
  // Postgres hace ROLLBACK y no queda nada guardado. Si termina bien, hace COMMIT.
  //
  // Con encargarFaltante = true, lo que no alcanza va a un encargue para ese cliente,
  // en la MISMA transacción: o se guardan venta y encargue, o ninguno.
  async create(dto: CreateVentaDto) {
    const ids = await this.dataSource.transaction(async (manager) => {
      const aVender: RenglonVenta[] = [];
      const aEncargar: Partial<DetalleEncargue>[] = [];

      for (const item of dto.detalles) {
        const variedad = await manager.findOne(Variedad, {
          where: { id: item.variedadId },
          relations: { categoria: true },
        });
        if (!variedad) {
          throw new NotFoundException(
            `La variedad con ID ${item.variedadId} no existe.`,
          );
        }
        const porUnidad = UNIDADES_POR_MODO[item.modo];
        const pedidas = item.cantidad * porUnidad;

        // Variedades por encargue (Garbanzo): nada sale de stock.
        if (variedad.categoria.porEncargue) {
          if (!dto.encargarFaltante) {
            throw new BadRequestException(
              `"${variedad.nombre}" se elabora por encargue, no se vende de stock.`,
            );
          }
          aEncargar.push({ variedadId: variedad.id, modo: item.modo, cantidad: pedidas });
          continue;
        }

        // Bloqueo la fila (SELECT ... FOR UPDATE): otra venta que quiera esta variedad
        // espera hasta que esta transacción termine. Así el stock que leo es el real
        // y nadie lo cambia entre que lo leo y lo descuento. También ve lo que ya
        // descontó un renglón anterior de esta misma venta.
        const { stock } = await manager.findOneOrFail(Variedad, {
          where: { id: variedad.id },
          lock: { mode: 'pessimistic_write' },
        });

        // Por docena solo se venden docenas completas; no se arma una docena
        // mitad de stock y mitad de encargue.
        const vender = Math.min(pedidas, Math.floor(stock / porUnidad) * porUnidad);
        const faltan = pedidas - vender;

        if (faltan > 0 && !dto.encargarFaltante) {
          throw new BadRequestException(
            `Stock insuficiente de "${variedad.nombre}": hay ${stock}, se piden ${pedidas}.`,
          );
        }
        if (vender > 0) {
          const precio = precioObligatorio(variedad, item.modo);
          await manager.decrement(Variedad, { id: variedad.id }, 'stock', vender);
          aVender.push({
            variedadId: variedad.id,
            modo: item.modo,
            cantidad: vender,
            precioUnitario: precio,
            subtotal: precio * (vender / porUnidad),
          });
        }
        if (faltan > 0) {
          aEncargar.push({ variedadId: variedad.id, modo: item.modo, cantidad: faltan });
        }
      }

      const ventaId =
        aVender.length > 0
          ? await guardarVenta(manager, aVender, dto.cliente ?? null)
          : null;

      let encargueId: number | null = null;
      if (aEncargar.length > 0) {
        const encargue = await manager.save(Encargue, {
          cliente: dto.cliente!, // el controller ya exige cliente y telefono
          telefono: dto.telefono!,
        });
        await manager.save(
          DetalleEncargue,
          aEncargar.map((d) => ({ ...d, encargueId: encargue.id })),
        );
        encargueId = encargue.id;
      }
      return { ventaId, encargueId };
    });

    // Respuesta siempre con la misma forma; el que no se creó viene en null.
    return {
      venta: ids.ventaId ? await this.findOne(ids.ventaId) : null,
      encargue: ids.encargueId
        ? await this.dataSource.getRepository(Encargue).findOne({
            where: { id: ids.encargueId },
            relations: { detalles: { variedad: true } },
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
  // - Venta de un encargue: no toca stock (nunca lo descontó); el encargue vuelve a "listo".
  async remove(id: number) {
    const venta = await this.findOne(id);
    await this.dataSource.transaction(async (manager) => {
      if (venta.encargueId) {
        await manager.update(Encargue, venta.encargueId, { estado: 'listo' });
      } else {
        for (const detalle of venta.detalles) {
          await manager.increment(
            Variedad,
            { id: detalle.variedadId },
            'stock',
            detalle.cantidad,
          );
        }
      }
      // Los renglones se borran solos por el onDelete: 'CASCADE'.
      await manager.delete(Venta, id);
    });
    return {
      message: venta.encargueId
        ? `La venta con ID ${id} fue anulada y el encargue ${venta.encargueId} volvió a "listo".`
        : `La venta con ID ${id} fue anulada y el stock devuelto.`,
    };
  }
}

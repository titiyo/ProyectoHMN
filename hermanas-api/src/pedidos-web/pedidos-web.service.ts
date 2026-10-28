import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { DetallePedidoWeb, EstadoPedidoWeb, PedidoWeb } from './entities/pedido-web.entity';
import { Ajuste } from './entities/ajuste.entity';
import { Variedad } from '../variedades/entities/variedad.entity';
import { Presentacion } from '../presentaciones/entities/presentacion.entity';
import { Encargue } from '../encargues/entities/encargue.entity';
import { DetalleEncargue } from '../encargues/entities/detalle-encargue.entity';
import { esPorEncargue, precioEfectivo } from '../common/precios';
import { MAX_INT } from '../common/validaciones';

export interface NuevoPedidoWeb {
  cliente: string;
  telefono: string | null;
  dia: string;
  horario: string;
  detalles: { variedadId: number; presentacionId: number; cantidad: number }[];
}

const RECIBIR = 'recibirPedidosWeb';
// Anti-spam simple: como mucho 5 pedidos cada 10 minutos desde la misma IP.
const VENTANA_MS = 10 * 60 * 1000;
const MAX_POR_VENTANA = 5;

@Injectable()
export class PedidosWebService {
  // En memoria: alcanza para un solo servidor (Render gratis) y se limpia solo al reiniciar.
  private intentos = new Map<string, number[]>();

  constructor(
    @InjectRepository(PedidoWeb) private readonly pedidosRepo: Repository<PedidoWeb>,
    @InjectRepository(Ajuste) private readonly ajustesRepo: Repository<Ajuste>,
    private readonly dataSource: DataSource,
  ) {}

  // ---- Interruptor "recibir pedidos web" (sin fila = activado) ----

  async recibe() {
    const fila = await this.ajustesRepo.findOneBy({ clave: RECIBIR });
    return fila ? fila.valor === 'true' : true;
  }

  async cambiarRecibe(valor: boolean) {
    await this.ajustesRepo.save({ clave: RECIBIR, valor: String(valor) });
    return { recibirPedidosWeb: valor };
  }

  private controlarSpam(ip: string) {
    const ahora = Date.now();
    const recientes = (this.intentos.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
    if (recientes.length >= MAX_POR_VENTANA) {
      throw new HttpException(
        'Recibimos varios pedidos seguidos desde acá. Esperá unos minutos o escribinos directo por WhatsApp.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recientes.push(ahora);
    this.intentos.set(ip, recientes);
  }

  // Lo llama el carrito público. Si el interruptor está apagado no guarda nada
  // (el cliente igual manda su WhatsApp); responde registrado: false.
  async crear(dto: NuevoPedidoWeb, ip: string) {
    if (!(await this.recibe())) return { registrado: false };
    this.controlarSpam(ip);

    // Nombres y precios salen SIEMPRE de la base, nunca de lo que mande el navegador.
    const variedades = await this.dataSource.getRepository(Variedad).find({
      where: { id: In(dto.detalles.map((d) => d.variedadId)) },
      relations: { categoria: true, precios: true },
    });
    const presentaciones = await this.dataSource.getRepository(Presentacion).findBy({
      id: In(dto.detalles.map((d) => d.presentacionId)),
    });

    const renglones = dto.detalles.map((d) => {
      const v = variedades.find((x) => x.id === d.variedadId);
      const p = presentaciones.find((x) => x.id === d.presentacionId);
      if (!v || !v.visible || !p || p.categoriaId !== v.categoriaId) {
        throw new BadRequestException('Algún producto del carrito ya no está disponible. Recargá la página.');
      }
      return {
        variedadId: v.id,
        presentacionId: p.id,
        descripcion: `${v.categoria.nombre} — ${v.nombre}`,
        presentacionNombre: p.nombre,
        cantidad: d.cantidad,
        precioUnitario: precioEfectivo(v, p),
        aPreguntar: !esPorEncargue(v) && v.stock === 0,
      };
    });
    const totalEstimado = renglones.reduce((t, r) => t + (r.precioUnitario ?? 0) * r.cantidad, 0);

    const id = await this.dataSource.transaction(async (manager) => {
      const pedido = await manager.save(PedidoWeb, {
        cliente: dto.cliente,
        telefono: dto.telefono,
        dia: dto.dia,
        horario: dto.horario,
        totalEstimado,
      });
      await manager.save(DetallePedidoWeb, renglones.map((r) => ({ ...r, pedidoId: pedido.id })));
      return pedido.id;
    });
    return { registrado: true, id };
  }

  listar(estado?: EstadoPedidoWeb) {
    return this.pedidosRepo.find({
      where: estado ? { estado } : {},
      relations: { detalles: true },
      order: { fecha: 'DESC', id: 'DESC', detalles: { id: 'ASC' } },
      take: 200,
    });
  }

  async contarNuevos() {
    return { nuevos: await this.pedidosRepo.countBy({ estado: 'nuevo' }) };
  }

  // Descartar: update condicional, solo si sigue "nuevo".
  async descartar(id: number) {
    if (id > MAX_INT) throw new NotFoundException(`El pedido ${id} no existe.`);
    const r = await this.pedidosRepo.update({ id, estado: 'nuevo' }, { estado: 'descartado' });
    if (r.affected === 0) {
      if (!(await this.pedidosRepo.existsBy({ id }))) throw new NotFoundException(`El pedido ${id} no existe.`);
      throw new ConflictException('Ese pedido ya no está como nuevo.');
    }
    return { message: `Pedido ${id} descartado.` };
  }

  // Pasar a encargue: crea el encargue (todo "por hacer", no toca stock) y marca el pedido.
  // Todo en una transacción y con el pedido bloqueado: dos clics no crean dos encargues.
  async pasarAEncargue(id: number) {
    if (id > MAX_INT) throw new NotFoundException(`El pedido ${id} no existe.`);
    const encargueId = await this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(PedidoWeb, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pedido) throw new NotFoundException(`El pedido ${id} no existe.`);
      if (pedido.estado !== 'nuevo') {
        throw new ConflictException('Ese pedido ya se pasó a encargue o se descartó.');
      }
      const detalles = await manager.findBy(DetallePedidoWeb, { pedidoId: id });
      const presentaciones = await manager.findBy(Presentacion, {
        id: In(detalles.map((d) => d.presentacionId)),
      });

      const encargue = await manager.save(Encargue, {
        cliente: pedido.cliente,
        telefono: pedido.telefono ?? 'por WhatsApp',
      });
      for (const d of detalles) {
        const p = presentaciones.find((x) => x.id === d.presentacionId);
        if (!p) {
          throw new ConflictException(
            `La presentación "${d.presentacionNombre}" ya no existe; cargá ese encargue a mano.`,
          );
        }
        await manager.save(DetalleEncargue, {
          encargueId: encargue.id,
          variedadId: d.variedadId,
          presentacionId: p.id,
          unidadesPorPresentacion: p.unidades,
          cantidad: d.cantidad * p.unidades, // a unidades de stock
          cantidadPreparada: 0,
        });
      }
      await manager.update(PedidoWeb, id, { estado: 'encargue', encargueId: encargue.id });
      return encargue.id;
    });
    return { message: `Pedido ${id} pasado al encargue #${encargueId}.`, encargueId };
  }
}

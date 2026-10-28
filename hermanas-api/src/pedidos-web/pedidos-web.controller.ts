import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { NuevoPedidoWeb, PedidosWebService } from './pedidos-web.service';
import type { EstadoPedidoWeb } from './entities/pedido-web.entity';
import { Public } from '../auth/public.decorator';
import { validarBooleano, validarCampos, validarEntero } from '../common/validaciones';

// Texto obligatorio con largo máximo (un formulario público no debe aceptar textos enormes).
function texto(valor: unknown, campo: string, max: number): string {
  if (typeof valor !== 'string' || valor.trim() === '' || valor.trim().length > max) {
    throw new BadRequestException(`${campo} es obligatorio (hasta ${max} caracteres)`);
  }
  return valor.trim();
}

const ESTADOS: EstadoPedidoWeb[] = ['nuevo', 'encargue', 'descartado'];

@Controller('pedidos-web')
export class PedidosWebController {
  constructor(private readonly service: PedidosWebService) {}

  // PÚBLICO: lo usa el carrito de la página al tocar "Encargar por WhatsApp".
  // "web" es un campo trampa invisible en el formulario: una persona nunca lo llena;
  // un robot que completa todo, sí. Si viene con algo, se finge éxito y no se guarda.
  @Public()
  @Post()
  crear(@Body() body: NuevoPedidoWeb & { web?: string }, @Ip() ip: string) {
    validarCampos(body, ['cliente', 'telefono', 'dia', 'horario', 'detalles', 'web']);
    if (body.web) return { registrado: true };
    if (!Array.isArray(body.detalles) || body.detalles.length === 0 || body.detalles.length > 30) {
      throw new BadRequestException('El carrito está vacío o tiene demasiados productos.');
    }
    const telefono =
      body.telefono === undefined || body.telefono === null || String(body.telefono).trim() === ''
        ? null
        : texto(body.telefono, 'telefono', 30);
    return this.service.crear(
      {
        cliente: texto(body.cliente, 'cliente', 60),
        telefono,
        dia: texto(body.dia, 'dia', 40),
        horario: texto(body.horario, 'horario', 40),
        detalles: body.detalles.map((d, i) => {
          validarCampos(d, ['variedadId', 'presentacionId', 'cantidad']);
          const cantidad = validarEntero(d.cantidad, `detalles[${i}].cantidad`);
          if (cantidad < 1 || cantidad > 100) {
            throw new BadRequestException(`detalles[${i}].cantidad debe estar entre 1 y 100`);
          }
          return {
            variedadId: validarEntero(d.variedadId, `detalles[${i}].variedadId`),
            presentacionId: validarEntero(d.presentacionId, `detalles[${i}].presentacionId`),
            cantidad,
          };
        }),
      },
      ip,
    );
  }

  // ---- Panel (con login) ----

  @Get()
  listar(@Query('estado') estado?: string) {
    if (estado !== undefined && !ESTADOS.includes(estado as EstadoPedidoWeb)) {
      throw new BadRequestException('estado debe ser nuevo, encargue o descartado');
    }
    return this.service.listar(estado as EstadoPedidoWeb | undefined);
  }

  // Van antes de ":id" para que "ajustes" y "nuevos" no se lean como un id.
  @Get('nuevos')
  contarNuevos() {
    return this.service.contarNuevos();
  }

  @Get('ajustes')
  async ajustes() {
    return { recibirPedidosWeb: await this.service.recibe() };
  }

  // body: { "recibirPedidosWeb": false }  → pausa la entrada de pedidos
  @Patch('ajustes')
  cambiarAjustes(@Body() body: { recibirPedidosWeb: boolean }) {
    validarCampos(body, ['recibirPedidosWeb']);
    return this.service.cambiarRecibe(validarBooleano(body.recibirPedidosWeb, 'recibirPedidosWeb'));
  }

  @Post(':id/encargue')
  pasarAEncargue(@Param('id', ParseIntPipe) id: number) {
    return this.service.pasarAEncargue(id);
  }

  @Patch(':id/descartar')
  descartar(@Param('id', ParseIntPipe) id: number) {
    return this.service.descartar(id);
  }
}

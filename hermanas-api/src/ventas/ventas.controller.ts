import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import {
  validarCampos,
  validarTexto,
} from '../common/validaciones';
import { validarDetalles } from '../common/detalles';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  // Convierte "dd-mm-yyyy" al inicio de ese día en hora de Argentina (UTC-3, sin horario de verano).
  // Si es "hasta", devuelve el inicio del día SIGUIENTE para incluir el día entero.
  private parsearFecha(texto: string, campo: string, esHasta: boolean): Date {
    const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(texto);
    if (!match) {
      throw new BadRequestException(`${campo} debe tener formato dd-mm-yyyy`);
    }
    const [, dd, mm, yyyy] = match;
    const fecha = new Date(`${yyyy}-${mm}-${dd}T00:00:00-03:00`);
    // new Date acepta "31-02" y lo corre a marzo; lo detecto comparando el día de vuelta.
    const comprobar = new Date(fecha.getTime() - 3 * 3600 * 1000);
    if (isNaN(fecha.getTime()) || comprobar.getUTCDate() !== Number(dd)) {
      throw new BadRequestException(`${campo} no es una fecha válida`);
    }
    if (esHasta) fecha.setTime(fecha.getTime() + 24 * 3600 * 1000);
    return fecha;
  }

  @Post()
  create(@Body() dto: CreateVentaDto) {
    validarCampos(dto, ['cliente', 'detalles', 'faltante', 'telefono']);
    const limpio: CreateVentaDto = { detalles: validarDetalles(dto.detalles) };

    if (dto.faltante !== undefined) {
      if (dto.faltante !== 'reservar' && dto.faltante !== 'hacer') {
        throw new BadRequestException('faltante debe ser "reservar" o "hacer"');
      }
      limpio.faltante = dto.faltante;
      // Puede terminar en encargue: hay que saber a quién avisarle.
      limpio.cliente = validarTexto(dto.cliente, 'cliente');
      limpio.telefono = validarTexto(dto.telefono, 'telefono');
    } else {
      if (dto.telefono !== undefined) {
        throw new BadRequestException('telefono solo se usa con faltante');
      }
      if (dto.cliente !== undefined && dto.cliente !== null) {
        limpio.cliente = validarTexto(dto.cliente, 'cliente');
      }
    }

    return this.ventasService.create(limpio);
  }

  // Historial: /ventas?desde=01-10-2026&hasta=24-10-2026 (los dos opcionales)
  @Get()
  findAll(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    const d = desde ? this.parsearFecha(desde, 'desde', false) : undefined;
    const h = hasta ? this.parsearFecha(hasta, 'hasta', true) : undefined;
    if (d && h && d >= h) {
      throw new BadRequestException('desde no puede ser posterior a hasta');
    }
    return this.ventasService.findAll(d, h);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.remove(id);
  }
}

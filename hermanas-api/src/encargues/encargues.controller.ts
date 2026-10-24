import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { EncarguesService, esEstado } from './encargues.service';
import { CreateEncargueDto, UpdateEncargueDto } from './dto/create-encargue.dto';
import { validarCampos, validarTexto } from '../common/validaciones';
import { validarDetalles } from '../common/detalles';
import { EstadoEncargue } from './entities/encargue.entity';

@Controller('encargues')
export class EncarguesController {
  constructor(private readonly encarguesService: EncarguesService) {}

  @Post()
  create(@Body() dto: CreateEncargueDto) {
    validarCampos(dto, ['cliente', 'telefono', 'detalles']);
    return this.encarguesService.create({
      cliente: validarTexto(dto.cliente, 'cliente'),
      telefono: validarTexto(dto.telefono, 'telefono'),
      detalles: validarDetalles(dto.detalles),
    });
  }

  // Filtro opcional: /encargues?estado=pendiente
  @Get()
  findAll(@Query('estado') estado?: string) {
    if (estado !== undefined && !esEstado(estado)) {
      throw new BadRequestException(
        'estado debe ser pendiente, listo o entregado',
      );
    }
    return this.encarguesService.findAll(estado as EstadoEncargue | undefined);
  }

  // Va ANTES de ':id': Nest prueba las rutas en orden, y si no
  // "por-hacer" se tomaría como un id (y ParseIntPipe daría 400).
  @Get('por-hacer')
  porHacer() {
    return this.encarguesService.porHacer();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.encarguesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEncargueDto,
  ) {
    validarCampos(dto, ['cliente', 'telefono']);
    const limpio: UpdateEncargueDto = {};
    if (dto.cliente !== undefined) limpio.cliente = validarTexto(dto.cliente, 'cliente');
    if (dto.telefono !== undefined) {
      limpio.telefono = validarTexto(dto.telefono, 'telefono');
    }
    return this.encarguesService.update(id, limpio);
  }

  // body: { "estado": "listo" }
  @Patch(':id/estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { estado: string },
  ) {
    validarCampos(body, ['estado']);
    if (!esEstado(body.estado)) {
      throw new BadRequestException(
        'estado debe ser pendiente, listo o entregado',
      );
    }
    return this.encarguesService.cambiarEstado(id, body.estado);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.encarguesService.remove(id);
  }
}

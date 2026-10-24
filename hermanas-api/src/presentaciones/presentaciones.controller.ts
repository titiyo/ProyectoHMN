import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { PresentacionesService } from './presentaciones.service';
import type { DatosPresentacion } from './presentaciones.service';
import {
  validarCampos,
  validarEntero,
  validarPrecio,
  validarTexto,
} from '../common/validaciones';

// Se listan junto con su categoría (GET /categorias); acá solo alta, edición y baja.
@Controller('presentaciones')
export class PresentacionesController {
  constructor(private readonly service: PresentacionesService) {}

  private limpiar(dto: DatosPresentacion, esAlta: boolean): DatosPresentacion {
    // categoriaId solo en el alta: una presentación no se muda de categoría.
    validarCampos(dto, esAlta
      ? ['categoriaId', 'nombre', 'unidades', 'precio', 'orden']
      : ['nombre', 'unidades', 'precio', 'orden']);
    const limpio: DatosPresentacion = {};
    if (esAlta) limpio.categoriaId = validarEntero(dto.categoriaId, 'categoriaId');
    if (esAlta || dto.nombre !== undefined) limpio.nombre = validarTexto(dto.nombre, 'nombre');
    if (esAlta || dto.unidades !== undefined) {
      const u = validarEntero(dto.unidades, 'unidades');
      if (u < 1 || u > 1000) throw new BadRequestException('unidades debe estar entre 1 y 1000');
      limpio.unidades = u;
    }
    if (dto.precio !== undefined) limpio.precio = validarPrecio(dto.precio, 'precio');
    if (dto.orden !== undefined) limpio.orden = validarEntero(dto.orden, 'orden');
    return limpio;
  }

  // body: { "categoriaId": 4, "nombre": "entera", "unidades": 4, "precio": 12000 }
  @Post()
  create(@Body() dto: DatosPresentacion) {
    const limpio = this.limpiar(dto, true);
    return this.service.create(limpio as Parameters<PresentacionesService['create']>[0]);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: DatosPresentacion) {
    return this.service.update(id, this.limpiar(dto, false));
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

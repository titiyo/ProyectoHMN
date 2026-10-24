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
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto, PresentacionInicialDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import {
  validarBooleano,
  validarCampos,
  validarEntero,
  validarPrecio,
  validarTexto,
  validarTextoOpcional,
} from '../common/validaciones';

const CAMPOS = ['nombre', 'porEncargue', 'nota'];

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  // Valida y limpia los campos que vinieron. En el POST nombre es obligatorio.
  private limpiar(dto: UpdateCategoriaDto, esAlta: boolean) {
    // "presentaciones" solo en el alta; después se manejan con /presentaciones.
    validarCampos(dto, esAlta ? [...CAMPOS, 'presentaciones'] : CAMPOS);
    const limpio: UpdateCategoriaDto = {};
    if (esAlta || dto.nombre !== undefined) {
      limpio.nombre = validarTexto(dto.nombre, 'nombre');
    }
    if (dto.porEncargue !== undefined) {
      limpio.porEncargue = validarBooleano(dto.porEncargue, 'porEncargue');
    }
    if (dto.nota !== undefined) {
      limpio.nota = validarTextoOpcional(dto.nota, 'nota');
    }
    if (esAlta) {
      const lista: unknown = dto.presentaciones;
      if (!Array.isArray(lista) || lista.length === 0 || lista.length > 10) {
        throw new BadRequestException(
          'presentaciones debe ser una lista de 1 a 10 (ej. [{ "nombre": "unidad", "unidades": 1 }])',
        );
      }
      limpio.presentaciones = lista.map((p: PresentacionInicialDto, i) => {
        validarCampos(p, ['nombre', 'unidades', 'precio']);
        const unidades = validarEntero(p.unidades, `presentaciones[${i}].unidades`);
        if (unidades < 1 || unidades > 1000) {
          throw new BadRequestException(`presentaciones[${i}].unidades debe estar entre 1 y 1000`);
        }
        return {
          nombre: validarTexto(p.nombre, `presentaciones[${i}].nombre`),
          unidades,
          precio: p.precio === undefined ? null : validarPrecio(p.precio, `presentaciones[${i}].precio`),
        };
      });
      const nombres = limpio.presentaciones.map((p) => p.nombre.toLowerCase());
      if (new Set(nombres).size !== nombres.length) {
        throw new BadRequestException('Hay presentaciones con el mismo nombre.');
      }
    }
    return limpio;
  }

  @Post()
  create(@Body() dto: CreateCategoriaDto) {
    return this.categoriasService.create(
      this.limpiar(dto, true) as CreateCategoriaDto,
    );
  }

  @Get()
  findAll(@Query('nombre') nombre?: string) {
    return this.categoriasService.findAll(nombre);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoriaDto,
  ) {
    return this.categoriasService.update(id, this.limpiar(dto, false));
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriasService.remove(id);
  }
}

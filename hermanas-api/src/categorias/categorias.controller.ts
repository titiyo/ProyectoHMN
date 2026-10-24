import {
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
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import {
  validarBooleano,
  validarCampos,
  validarTexto,
  validarTextoOpcional,
} from '../common/validaciones';

const CAMPOS = ['nombre', 'porEncargue', 'nota'];

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  // Valida y limpia los campos que vinieron. En el POST nombre es obligatorio.
  private limpiar(dto: UpdateCategoriaDto, esAlta: boolean) {
    validarCampos(dto, CAMPOS);
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

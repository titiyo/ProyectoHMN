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
import { VariedadesService, FiltrosVariedad } from './variedades.service';
import { CreateVariedadDto } from './dto/create-variedad.dto';
import { UpdateVariedadDto } from './dto/update-variedad.dto';
import {
  MAX_INT,
  validarBooleano,
  validarCampos,
  validarEntero,
  validarPrecio,
  validarTexto,
} from '../common/validaciones';

const CAMPOS = [
  'nombre',
  'categoriaId',
  'precioUnidad',
  'precioDocena',
  'stock',
  'visible',
];

@Controller('variedades')
export class VariedadesController {
  constructor(private readonly variedadesService: VariedadesService) {}

  private limpiar(dto: UpdateVariedadDto, esAlta: boolean) {
    validarCampos(dto, CAMPOS);
    const limpio: UpdateVariedadDto = {};
    if (esAlta || dto.nombre !== undefined) {
      limpio.nombre = validarTexto(dto.nombre, 'nombre');
    }
    if (esAlta || dto.categoriaId !== undefined) {
      limpio.categoriaId = validarEntero(dto.categoriaId, 'categoriaId');
    }
    if (dto.precioUnidad !== undefined) {
      limpio.precioUnidad = validarPrecio(dto.precioUnidad, 'precioUnidad');
    }
    if (dto.precioDocena !== undefined) {
      limpio.precioDocena = validarPrecio(dto.precioDocena, 'precioDocena');
    }
    if (dto.stock !== undefined) {
      limpio.stock = validarEntero(dto.stock, 'stock');
    }
    if (dto.visible !== undefined) {
      limpio.visible = validarBooleano(dto.visible, 'visible');
    }
    return limpio;
  }

  @Post()
  create(@Body() dto: CreateVariedadDto) {
    return this.variedadesService.create(
      this.limpiar(dto, true) as CreateVariedadDto,
    );
  }

  // Filtros opcionales: ?nombre=queso&categoriaId=1&visible=true
  @Get()
  findAll(
    @Query('nombre') nombre?: string,
    @Query('categoriaId') categoriaId?: string,
    @Query('visible') visible?: string,
  ) {
    const filtros: FiltrosVariedad = { nombre };
    if (categoriaId !== undefined) {
      const n = Number(categoriaId);
      if (!Number.isInteger(n) || n < 1 || n > MAX_INT) {
        throw new BadRequestException('categoriaId debe ser un entero positivo');
      }
      filtros.categoriaId = n;
    }
    if (visible !== undefined) {
      if (visible !== 'true' && visible !== 'false') {
        throw new BadRequestException('visible debe ser true o false');
      }
      filtros.visible = visible === 'true';
    }
    return this.variedadesService.findAll(filtros);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.variedadesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVariedadDto,
  ) {
    return this.variedadesService.update(id, this.limpiar(dto, false));
  }

  // Botones +/- del panel: body { "delta": 1 } o { "delta": -12 }
  @Patch(':id/stock')
  ajustarStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { delta: number },
  ) {
    validarCampos(body, ['delta']);
    const { delta } = body;
    if (
      typeof delta !== 'number' ||
      !Number.isInteger(delta) ||
      delta === 0 ||
      Math.abs(delta) > 10000
    ) {
      throw new BadRequestException(
        'delta debe ser un entero distinto de 0 (máximo 10000)',
      );
    }
    return this.variedadesService.ajustarStock(id, delta);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.variedadesService.remove(id);
  }
}

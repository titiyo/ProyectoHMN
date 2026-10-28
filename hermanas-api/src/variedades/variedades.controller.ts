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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_FOTO_BYTES } from '../common/cloudinary';
import { VariedadesService, FiltrosVariedad } from './variedades.service';
import { CreateVariedadDto } from './dto/create-variedad.dto';
import { UpdateVariedadDto } from './dto/update-variedad.dto';
import {
  MAX_INT,
  validarBooleano,
  validarBooleanoOpcional,
  validarCampos,
  validarEntero,
  validarPrecio,
  validarTexto,
} from '../common/validaciones';

const CAMPOS = ['nombre', 'categoriaId', 'porEncargue', 'stock', 'visible', 'precios'];

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
    if (dto.porEncargue !== undefined) {
      limpio.porEncargue = validarBooleanoOpcional(dto.porEncargue, 'porEncargue');
    }
    // precios: [{ presentacionId, precio }]  (precio null = usar el de la categoría)
    if (dto.precios !== undefined) {
      if (!Array.isArray(dto.precios) || dto.precios.length > 20) {
        throw new BadRequestException('precios debe ser una lista');
      }
      limpio.precios = dto.precios.map((p, i) => {
        validarCampos(p, ['presentacionId', 'precio']);
        return {
          presentacionId: validarEntero(p.presentacionId, `precios[${i}].presentacionId`),
          precio: validarPrecio(p.precio, `precios[${i}].precio`),
        };
      });
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

  // Subir o cambiar la foto: formulario multipart con el campo "foto".
  // FileInterceptor la deja en memoria (no en disco) y corta si pesa de más.
  @Post(':id/foto')
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: MAX_FOTO_BYTES } }))
  subirFoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    if (!archivo) throw new BadRequestException('Falta el archivo "foto".');
    return this.variedadesService.subirFoto(id, archivo);
  }

  @Delete(':id/foto')
  quitarFoto(@Param('id', ParseIntPipe) id: number) {
    return this.variedadesService.quitarFoto(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.variedadesService.remove(id);
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Variedad } from './entities/variedad.entity';
import { PrecioVariedad } from './entities/precio-variedad.entity';
import { CreateVariedadDto, PrecioPropioDto } from './dto/create-variedad.dto';
import { UpdateVariedadDto } from './dto/update-variedad.dto';
import { CategoriasService } from '../categorias/categorias.service';
import { DetalleVenta } from '../ventas/entities/detalle-venta.entity';
import { DetalleEncargue } from '../encargues/entities/detalle-encargue.entity';
import { Presentacion } from '../presentaciones/entities/presentacion.entity';
import { MAX_INT, normalizar } from '../common/validaciones';

export interface FiltrosVariedad {
  nombre?: string;
  categoriaId?: number;
  visible?: boolean;
}

const RELACIONES = { categoria: true, precios: true };

@Injectable()
export class VariedadesService {
  constructor(
    @InjectRepository(Variedad)
    private readonly variedadesRepository: Repository<Variedad>,
    private readonly categoriasService: CategoriasService,
    @InjectRepository(DetalleVenta)
    private readonly detallesRepository: Repository<DetalleVenta>,
    @InjectRepository(DetalleEncargue)
    private readonly detallesEncargueRepository: Repository<DetalleEncargue>,
    private readonly dataSource: DataSource,
  ) {}

  // El nombre se repite solo entre categorías distintas, no dentro de la misma.
  private async verificarNombreLibre(
    nombre: string,
    categoriaId: number,
    idActual?: number,
  ) {
    const mismas = await this.variedadesRepository.findBy({ categoriaId });
    const repetida = mismas.find(
      (v) => normalizar(v.nombre) === normalizar(nombre) && v.id !== idActual,
    );
    if (repetida) {
      throw new ConflictException(
        `Ya existe la variedad "${nombre}" en esa categoría.`,
      );
    }
  }

  // Guarda los precios propios: número = crear o cambiar; null = borrar (vuelve al de la categoría).
  // Cada presentación tiene que ser de la categoría de la variedad.
  private async guardarPrecios(
    manager: EntityManager,
    variedadId: number,
    categoriaId: number,
    precios: PrecioPropioDto[],
  ) {
    for (const { presentacionId, precio } of precios) {
      const presentacion = await manager.findOneBy(Presentacion, { id: presentacionId });
      if (!presentacion || presentacion.categoriaId !== categoriaId) {
        throw new BadRequestException(
          `La presentación ${presentacionId} no es de la categoría de esta variedad.`,
        );
      }
      if (precio === null) {
        await manager.delete(PrecioVariedad, { variedadId, presentacionId });
      } else {
        // upsert = insertar, o actualizar si ya existe esa combinación (la UNIQUE).
        await manager.upsert(PrecioVariedad, { variedadId, presentacionId, precio }, [
          'variedadId',
          'presentacionId',
        ]);
      }
    }
  }

  async create(dto: CreateVariedadDto) {
    await this.categoriasService.findOne(dto.categoriaId); // 404 si no existe
    await this.verificarNombreLibre(dto.nombre, dto.categoriaId);
    const { precios, ...datos } = dto;
    const id = await this.dataSource.transaction(async (manager) => {
      const nueva = await manager.save(Variedad, datos);
      if (precios) await this.guardarPrecios(manager, nueva.id, nueva.categoriaId, precios);
      return nueva.id;
    });
    return this.findOne(id);
  }

  findAll(filtros: FiltrosVariedad = {}) {
    const where: FindOptionsWhere<Variedad> = {};
    if (filtros.nombre) where.nombre = ILike(`%${filtros.nombre}%`);
    if (filtros.categoriaId !== undefined) where.categoriaId = filtros.categoriaId;
    if (filtros.visible !== undefined) where.visible = filtros.visible;
    return this.variedadesRepository.find({
      where,
      relations: RELACIONES,
      order: { categoriaId: 'ASC', nombre: 'ASC' },
    });
  }

  async findOne(id: number) {
    const variedad =
      id > MAX_INT
        ? null
        : await this.variedadesRepository.findOne({ where: { id }, relations: RELACIONES });
    if (!variedad) {
      throw new NotFoundException(`La variedad con ID ${id} no existe.`);
    }
    return variedad;
  }

  async update(id: number, dto: UpdateVariedadDto) {
    const variedad = await this.findOne(id);
    const categoriaId = dto.categoriaId ?? variedad.categoriaId;
    const cambiaCategoria = categoriaId !== variedad.categoriaId;
    if (dto.categoriaId !== undefined) {
      await this.categoriasService.findOne(dto.categoriaId);
    }
    if (dto.nombre !== undefined || dto.categoriaId !== undefined) {
      await this.verificarNombreLibre(dto.nombre ?? variedad.nombre, categoriaId, id);
    }
    const { precios, ...datos } = dto;
    await this.dataSource.transaction(async (manager) => {
      if (Object.keys(datos).length > 0) await manager.update(Variedad, id, datos);
      // Los precios propios son de presentaciones de la categoría vieja: ya no aplican.
      if (cambiaCategoria) await manager.delete(PrecioVariedad, { variedadId: id });
      if (precios) await this.guardarPrecios(manager, id, categoriaId, precios);
    });
    return this.findOne(id);
  }

  // Suma o resta unidades. La resta se hace en la misma consulta SQL con la condición
  // "stock + delta >= 0", así dos pedidos a la vez no pueden dejar stock negativo.
  async ajustarStock(id: number, delta: number) {
    await this.findOne(id); // 404 si no existe
    const resultado = await this.variedadesRepository
      .createQueryBuilder()
      .update(Variedad)
      .set({ stock: () => 'stock + :delta' })
      .where('id = :id AND stock + :delta >= 0', { id, delta })
      .execute();
    if (resultado.affected === 0) {
      throw new BadRequestException('El stock no puede quedar negativo.');
    }
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    // Si ya se vendió o encargó, borrarla rompería el historial: 409 y que se oculte.
    const usos =
      (await this.detallesRepository.countBy({ variedadId: id })) +
      (await this.detallesEncargueRepository.countBy({ variedadId: id }));
    if (usos > 0) {
      throw new ConflictException(
        `No se puede eliminar la variedad con ID ${id} porque tiene ventas o encargues. Ocultala con visible = false.`,
      );
    }
    await this.variedadesRepository.delete(id);
    return { message: `La variedad con ID ${id} fue eliminada.` };
  }
}

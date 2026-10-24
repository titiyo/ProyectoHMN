import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Variedad } from './entities/variedad.entity';
import { CreateVariedadDto } from './dto/create-variedad.dto';
import { UpdateVariedadDto } from './dto/update-variedad.dto';
import { CategoriasService } from '../categorias/categorias.service';
import { DetalleVenta } from '../ventas/entities/detalle-venta.entity';
import { MAX_INT, normalizar } from '../common/validaciones';

export interface FiltrosVariedad {
  nombre?: string;
  categoriaId?: number;
  visible?: boolean;
}

@Injectable()
export class VariedadesService {
  constructor(
    @InjectRepository(Variedad)
    private readonly variedadesRepository: Repository<Variedad>,
    private readonly categoriasService: CategoriasService,
    @InjectRepository(DetalleVenta)
    private readonly detallesRepository: Repository<DetalleVenta>,
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

  async create(dto: CreateVariedadDto) {
    await this.categoriasService.findOne(dto.categoriaId); // 404 si no existe
    await this.verificarNombreLibre(dto.nombre, dto.categoriaId);
    const nueva = await this.variedadesRepository.save(dto);
    return this.findOne(nueva.id);
  }

  findAll(filtros: FiltrosVariedad = {}) {
    const where: FindOptionsWhere<Variedad> = {};
    if (filtros.nombre) where.nombre = ILike(`%${filtros.nombre}%`);
    if (filtros.categoriaId !== undefined) where.categoriaId = filtros.categoriaId;
    if (filtros.visible !== undefined) where.visible = filtros.visible;
    return this.variedadesRepository.find({
      where,
      relations: { categoria: true },
      order: { categoriaId: 'ASC', nombre: 'ASC' },
    });
  }

  async findOne(id: number) {
    const variedad =
      id > MAX_INT
        ? null
        : await this.variedadesRepository.findOne({
            where: { id },
            relations: { categoria: true },
          });
    if (!variedad) {
      throw new NotFoundException(`La variedad con ID ${id} no existe.`);
    }
    return variedad;
  }

  async update(id: number, dto: UpdateVariedadDto) {
    const variedad = await this.findOne(id);
    const categoriaId = dto.categoriaId ?? variedad.categoriaId;
    if (dto.categoriaId !== undefined) {
      await this.categoriasService.findOne(dto.categoriaId);
    }
    if (dto.nombre !== undefined || dto.categoriaId !== undefined) {
      await this.verificarNombreLibre(dto.nombre ?? variedad.nombre, categoriaId, id);
    }
    // update() en vez de save() para no arrastrar la relación categoria vieja.
    await this.variedadesRepository.update(id, dto);
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
    // Si ya se vendió, borrarla rompería el historial: 409 y que se oculte.
    const ventas = await this.detallesRepository.countBy({ variedadId: id });
    if (ventas > 0) {
      throw new ConflictException(
        `No se puede eliminar la variedad con ID ${id} porque tiene ventas. Ocultala con visible = false.`,
      );
    }
    await this.variedadesRepository.delete(id);
    return { message: `La variedad con ID ${id} fue eliminada.` };
  }
}

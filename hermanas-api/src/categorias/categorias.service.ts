import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { Presentacion } from '../presentaciones/entities/presentacion.entity';
import { Categoria } from './entities/categoria.entity';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { MAX_INT, normalizar } from '../common/validaciones';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriasRepository: Repository<Categoria>,
    private readonly dataSource: DataSource,
  ) {}

  // 409 si ya hay otra categoría con el mismo nombre (sin contar mayúsculas/espacios).
  private async verificarNombreLibre(nombre: string, idActual?: number) {
    const todas = await this.categoriasRepository.find();
    const repetida = todas.find(
      (c) => normalizar(c.nombre) === normalizar(nombre) && c.id !== idActual,
    );
    if (repetida) {
      throw new ConflictException(`La categoría "${nombre}" ya existe.`);
    }
  }

  async create(dto: CreateCategoriaDto) {
    await this.verificarNombreLibre(dto.nombre);
    const { presentaciones = [], ...datos } = dto;
    // Categoría + presentaciones juntas: si falla una presentación, no queda
    // una categoría sin forma de venderse.
    const id = await this.dataSource.transaction(async (manager) => {
      const nueva = await manager.save(Categoria, datos);
      await manager.save(
        Presentacion,
        presentaciones.map((p, orden) => ({ ...p, orden, categoriaId: nueva.id })),
      );
      return nueva.id;
    });
    return this.findOne(id);
  }

  // Cada categoría viene con sus presentaciones ordenadas (unidad antes que docena).
  findAll(nombre?: string) {
    return this.categoriasRepository.find({
      where: nombre ? { nombre: ILike(`%${nombre}%`) } : {},
      relations: { presentaciones: true },
      order: { id: 'ASC', presentaciones: { orden: 'ASC', unidades: 'ASC' } },
    });
  }

  async findOne(id: number) {
    const categoria =
      id > MAX_INT
        ? null
        : await this.categoriasRepository.findOne({
            where: { id },
            relations: { variedades: true, presentaciones: true },
            order: { presentaciones: { orden: 'ASC', unidades: 'ASC' } },
          });
    if (!categoria) {
      throw new NotFoundException(`La categoría con ID ${id} no existe.`);
    }
    return categoria;
  }

  async update(id: number, dto: UpdateCategoriaDto) {
    await this.findOne(id); // 404 si no existe
    if (dto.nombre !== undefined) {
      await this.verificarNombreLibre(dto.nombre, id);
    }
    // update() solo toca las columnas propias (no las relaciones).
    await this.categoriasRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const categoria = await this.findOne(id);
    if (categoria.variedades.length > 0) {
      throw new ConflictException(
        `No se puede eliminar la categoría con ID ${id} porque tiene variedades.`,
      );
    }
    await this.categoriasRepository.delete(id);
    return { message: `La categoría con ID ${id} fue eliminada.` };
  }
}

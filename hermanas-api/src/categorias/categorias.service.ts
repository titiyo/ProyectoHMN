import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Categoria } from './entities/categoria.entity';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { MAX_INT, normalizar } from '../common/validaciones';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriasRepository: Repository<Categoria>,
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
    return this.categoriasRepository.save(dto);
  }

  findAll(nombre?: string) {
    return this.categoriasRepository.find({
      where: nombre ? { nombre: ILike(`%${nombre}%`) } : {},
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const categoria =
      id > MAX_INT
        ? null
        : await this.categoriasRepository.findOne({
            where: { id },
            relations: { variedades: true },
          });
    if (!categoria) {
      throw new NotFoundException(`La categoría con ID ${id} no existe.`);
    }
    return categoria;
  }

  async update(id: number, dto: UpdateCategoriaDto) {
    const categoria = await this.findOne(id);
    if (dto.nombre !== undefined) {
      await this.verificarNombreLibre(dto.nombre, id);
    }
    // Saco las variedades para que save() no intente tocarlas.
    const { variedades, ...datos } = categoria;
    void variedades;
    return this.categoriasRepository.save({ ...datos, ...dto });
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

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Presentacion } from './entities/presentacion.entity';
import { Categoria } from '../categorias/entities/categoria.entity';
import { DetalleEncargue } from '../encargues/entities/detalle-encargue.entity';
import { MAX_INT, normalizar } from '../common/validaciones';

export interface DatosPresentacion {
  categoriaId?: number;
  nombre?: string;
  unidades?: number;
  precio?: number | null;
  orden?: number;
}

@Injectable()
export class PresentacionesService {
  constructor(
    @InjectRepository(Presentacion)
    private readonly repo: Repository<Presentacion>,
    @InjectRepository(Categoria)
    private readonly categoriasRepo: Repository<Categoria>,
    @InjectRepository(DetalleEncargue)
    private readonly detallesEncargueRepo: Repository<DetalleEncargue>,
  ) {}

  private async verificarNombreLibre(categoriaId: number, nombre: string, idActual?: number) {
    const mismas = await this.repo.findBy({ categoriaId });
    if (mismas.some((p) => normalizar(p.nombre) === normalizar(nombre) && p.id !== idActual)) {
      throw new ConflictException(`La categoría ya tiene una presentación "${nombre}".`);
    }
  }

  async create(dto: Required<Pick<DatosPresentacion, 'categoriaId' | 'nombre' | 'unidades'>> & DatosPresentacion) {
    if (!(await this.categoriasRepo.existsBy({ id: dto.categoriaId }))) {
      throw new NotFoundException(`La categoría con ID ${dto.categoriaId} no existe.`);
    }
    await this.verificarNombreLibre(dto.categoriaId, dto.nombre);
    return this.repo.save(dto);
  }

  async findOne(id: number) {
    const p = id > MAX_INT ? null : await this.repo.findOneBy({ id });
    if (!p) throw new NotFoundException(`La presentación con ID ${id} no existe.`);
    return p;
  }

  async update(id: number, dto: DatosPresentacion) {
    const actual = await this.findOne(id);
    if (dto.nombre !== undefined) {
      await this.verificarNombreLibre(actual.categoriaId, dto.nombre, id);
    }
    // Cambiar "unidades" (ej. tarta de 4 a 6 porciones) no rompe nada guardado:
    // ventas y encargues ya tienen sus cantidades en unidades de stock.
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const p = await this.findOne(id);
    const otras = await this.repo.countBy({ categoriaId: p.categoriaId, id: Not(id) });
    if (otras === 0) {
      throw new ConflictException(
        'Es la única presentación de la categoría: sin ninguna no se podría vender.',
      );
    }
    // Un encargue sin entregar se cobra al entregar con el precio de su presentación.
    const enUso = await this.detallesEncargueRepo.count({
      where: { presentacionId: id, encargue: { estado: Not('entregado') } },
    });
    if (enUso > 0) {
      throw new ConflictException(
        `No se puede eliminar "${p.nombre}": hay encargues sin entregar que la usan.`,
      );
    }
    // Las ventas viejas no se rompen: guardan una copia del nombre y las unidades.
    await this.repo.delete(id);
    return { message: `La presentación "${p.nombre}" fue eliminada.` };
  }
}

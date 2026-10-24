import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from '../categorias/entities/categoria.entity';

export type EstadoCatalogo = 'disponible' | 'agotado' | 'encargue';

// Lo que ve el público. Es una "vista" armada a mano: se elige campo por campo qué sale,
// así el stock exacto, los ids internos o las variedades ocultas nunca se filtran.
@Injectable()
export class CatalogoService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriasRepository: Repository<Categoria>,
  ) {}

  async obtener() {
    const categorias = await this.categoriasRepository.find({
      relations: { variedades: true },
      order: { id: 'ASC', variedades: { nombre: 'ASC' } },
    });

    return categorias
      .map((categoria) => ({
        nombre: categoria.nombre,
        porEncargue: categoria.porEncargue,
        variedades: categoria.variedades
          .filter((v) => v.visible)
          .map((v) => ({
            nombre: v.nombre,
            // Precio efectivo; null = "consultar".
            precioUnidad: v.precioUnidad ?? categoria.precioUnidad,
            precioDocena: v.precioDocena ?? categoria.precioDocena,
            estado: (categoria.porEncargue
              ? 'encargue'
              : v.stock > 0
                ? 'disponible'
                : 'agotado') as EstadoCatalogo,
          })),
      }))
      .filter((c) => c.variedades.length > 0); // categorías vacías no se muestran
  }
}

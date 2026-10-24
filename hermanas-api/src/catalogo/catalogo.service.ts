import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from '../categorias/entities/categoria.entity';
import { esPorEncargue, precioEfectivo } from '../common/precios';

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
      relations: { presentaciones: true, variedades: { precios: true } },
      order: {
        id: 'ASC',
        presentaciones: { orden: 'ASC', unidades: 'ASC' },
        variedades: { nombre: 'ASC' },
      },
    });

    return categorias
      .map((categoria) => ({
        nombre: categoria.nombre,
        nota: categoria.nota,
        variedades: categoria.variedades
          .filter((v) => v.visible)
          .map((v) => {
            // esPorEncargue necesita la categoría colgada de la variedad.
            const variedad = { ...v, categoria };
            return {
              nombre: v.nombre,
              // Precio efectivo de cada presentación; null = "consultar".
              precios: categoria.presentaciones.map((p) => ({
                presentacion: p.nombre,
                precio: precioEfectivo(variedad, p),
              })),
              estado: (esPorEncargue(variedad)
                ? 'encargue'
                : v.stock > 0
                  ? 'disponible'
                  : 'agotado') as EstadoCatalogo,
            };
          }),
      }))
      .filter((c) => c.variedades.length > 0); // categorías vacías no se muestran
  }
}

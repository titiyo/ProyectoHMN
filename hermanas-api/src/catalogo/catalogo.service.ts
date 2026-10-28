import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from '../categorias/entities/categoria.entity';
import { esPorEncargue, precioEfectivo } from '../common/precios';

export type EstadoCatalogo = 'disponible' | 'agotado' | 'encargue';

// "Milanesas de soja rellenas" → "milanesas-de-soja-rellenas" (para la dirección de la página).
export function slug(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // saca tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Lo que ve el público. Es una "vista" armada a mano: se elige campo por campo qué sale,
// así el stock exacto o las variedades ocultas nunca se filtran. Los ids sí salen:
// el carrito los necesita para mandar el pedido, y no dicen nada sensible.
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
        id: categoria.id,
        slug: slug(categoria.nombre),
        nombre: categoria.nombre,
        nota: categoria.nota,
        variedades: categoria.variedades
          .filter((v) => v.visible)
          .map((v) => {
            // esPorEncargue necesita la categoría colgada de la variedad.
            const variedad = { ...v, categoria };
            return {
              id: v.id,
              nombre: v.nombre,
              foto: v.foto,
              // Precio efectivo de cada presentación; null = "consultar".
              precios: categoria.presentaciones.map((p) => ({
                presentacionId: p.id,
                presentacion: p.nombre,
                unidades: p.unidades,
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

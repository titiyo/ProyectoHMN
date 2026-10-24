import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from '../categorias/entities/categoria.entity';
import { Variedad } from '../variedades/entities/variedad.entity';

// Datos reales del negocio. Precios en null: los carga la vendedora desde Configuración.
const DATOS = [
  {
    nombre: 'Soja',
    porEncargue: false,
    variedades: [
      'Zapallitos', 'Calabaza & roquefort', 'Ciboulette', 'Chop suey de vegetales',
      'Puerro', 'Cuatro quesos', 'Cebolla caramelizada', 'Humita', 'Verdura',
      'Jamón & queso', 'Roquefort', 'Calabaza', 'Brócolis', 'Hongos', 'Capresse',
      'Palta y tomates', 'Ricota y nuez', 'Solo queso',
    ],
  },
  {
    nombre: 'Garbanzo',
    porEncargue: true,
    variedades: ['Remolacha y huevo', 'Apio-roque & nuez', 'Choclo y huevo', 'Batata'],
  },
];

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriasRepository: Repository<Categoria>,
    @InjectRepository(Variedad)
    private readonly variedadesRepository: Repository<Variedad>,
  ) {}

  // Solo carga si la base está vacía, para no pisar lo que haya cambiado la vendedora.
  async onModuleInit() {
    if ((await this.categoriasRepository.count()) > 0) return;
    for (const dato of DATOS) {
      const categoria = await this.categoriasRepository.save({
        nombre: dato.nombre,
        porEncargue: dato.porEncargue,
      });
      await this.variedadesRepository.save(
        dato.variedades.map((nombre) => ({ nombre, categoriaId: categoria.id })),
      );
    }
  }
}

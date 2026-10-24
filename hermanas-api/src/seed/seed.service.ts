import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Categoria } from '../categorias/entities/categoria.entity';
import { Variedad } from '../variedades/entities/variedad.entity';
import { Presentacion } from '../presentaciones/entities/presentacion.entity';

// Presentaciones que se repiten.
const UNIDAD_DOCENA = [
  { nombre: 'unidad', unidades: 1 },
  { nombre: 'docena', unidades: 12 },
];

// Menú real. Precios en null: los carga la vendedora desde Configuración.
// Todo lo de acá (notas, presentaciones, por encargue) se edita después en Configuración.
const MENU = [
  {
    nombre: 'Milanesas de soja rellenas',
    porEncargue: false,
    nota: 'Todas contienen queso',
    presentaciones: UNIDAD_DOCENA,
    variedades: [
      'Brócoli', 'Verdura', 'Ricota y nuez', 'Cebolla caramelizada', 'Jamón y queso',
      'Roquefort', '4 quesos', 'Ciboulette', 'Chop suey (salteado de vegetales)',
      'Zapallitos', 'Caprese', 'Hongos', 'Humita', 'Calabaza', 'Calabaza y roquefort',
      'Calabaza choclo y cebolla', 'Palta y tomate', 'Puerros salteados',
    ],
  },
  {
    nombre: 'Milanesas de garbanzos',
    porEncargue: true,
    nota: 'Elaboramos por encargue',
    presentaciones: UNIDAD_DOCENA,
    variedades: [
      'Batata y queso', 'Choclo y huevo', 'Apio roque y nuez', 'Remolacha y huevo', 'Queso solo',
    ],
  },
  {
    nombre: 'Rolls integrales vegetarianos',
    porEncargue: true,
    nota: null,
    presentaciones: [
      { nombre: 'unidad', unidades: 1 },
      { nombre: 'media docena', unidades: 6 },
      { nombre: 'docena', unidades: 12 },
    ],
    variedades: ['Verdura', 'Calabaza choclo y cebolla', 'Vegetales salteados', 'Pollo'],
  },
  {
    nombre: 'Tartas integrales',
    porEncargue: true,
    nota: null,
    // El stock de tartas se cuenta en porciones; una entera son 4 (editable).
    presentaciones: [
      { nombre: 'porción', unidades: 1 },
      { nombre: 'entera', unidades: 4 },
    ],
    variedades: ['Zapallitos', 'Verdura', 'Calabaza choclo y cebolla', 'Pollo'],
  },
  {
    nombre: 'Hamburguesas veganas',
    porEncargue: true,
    nota: null,
    presentaciones: [
      { nombre: 'unidad', unidades: 1 },
      { nombre: 'caja x4', unidades: 4 },
    ],
    variedades: ['Lenteja zanahoria y verdura', 'Garbanzo y brócoli', 'Arveja y calabaza'],
  },
];

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriasRepository: Repository<Categoria>,
    private readonly dataSource: DataSource,
  ) {}

  // Solo carga si la base está vacía, para no pisar lo que haya cambiado la vendedora.
  // Todo en UNA transacción: si la API se cae a mitad de la carga, no queda medio menú
  // (que el próximo arranque no completaría, porque ya vería categorías).
  async onModuleInit() {
    if ((await this.categoriasRepository.count()) > 0) return;
    await this.dataSource.transaction(async (manager) => {
      for (const dato of MENU) {
        const categoria = await manager.save(Categoria, {
          nombre: dato.nombre,
          porEncargue: dato.porEncargue,
          nota: dato.nota,
        });
        await manager.save(
          Presentacion,
          dato.presentaciones.map((p, orden) => ({ ...p, orden, categoriaId: categoria.id })),
        );
        await manager.save(
          Variedad,
          dato.variedades.map((nombre) => ({ nombre, categoriaId: categoria.id })),
        );
      }
    });
  }
}

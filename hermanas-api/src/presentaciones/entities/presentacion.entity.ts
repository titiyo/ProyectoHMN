import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Categoria } from '../../categorias/entities/categoria.entity';

// Una forma de vender los productos de una categoría.
// Ej. Milanesas: "unidad" (1) y "docena" (12). Tartas: "porción" (1) y "entera" (4).
// "unidades" dice cuántas unidades de STOCK descuenta: el stock siempre se cuenta
// en la presentación más chica (milanesas sueltas, porciones de tarta).
@Entity()
@Unique(['categoriaId', 'nombre']) // no dos "docena" en la misma categoría
export class Presentacion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'categoria_id' })
  categoriaId!: number;

  // Si se borra la categoría, se borran sus presentaciones.
  @ManyToOne(() => Categoria, (c) => c.presentaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoria_id' })
  categoria!: Categoria;

  @Column()
  nombre!: string;

  @Column({ type: 'int' })
  unidades!: number;

  // Precio base de la categoría para esta presentación. null = sin precio cargado.
  @Column({ type: 'int', nullable: true })
  precio!: number | null;

  // Orden para mostrarlas (de la más chica a la más grande).
  @Column({ type: 'int', default: 0 })
  orden!: number;
}

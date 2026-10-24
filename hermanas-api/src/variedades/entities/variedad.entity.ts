import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Categoria } from '../../categorias/entities/categoria.entity';

@Entity()
export class Variedad {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nombre!: string;

  // Guardo el id como columna propia para poder filtrar y crear sin cargar la categoría entera.
  @Column({ name: 'categoria_id' })
  categoriaId!: number;

  @ManyToOne(() => Categoria, (categoria) => categoria.variedades)
  @JoinColumn({ name: 'categoria_id' })
  categoria!: Categoria;

  // null = usa el precio de la categoría.
  @Column({ type: 'int', nullable: true })
  precioUnidad!: number | null;

  @Column({ type: 'int', nullable: true })
  precioDocena!: number | null;

  // Siempre en unidades (una docena = 12).
  @Column({ type: 'int', default: 0 })
  stock!: number;

  // false = no aparece en el catálogo público.
  @Column({ default: true })
  visible!: boolean;
}

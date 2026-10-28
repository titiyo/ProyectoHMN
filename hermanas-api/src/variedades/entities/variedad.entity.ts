import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Categoria } from '../../categorias/entities/categoria.entity';
import { PrecioVariedad } from './precio-variedad.entity';

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

  // Precios propios por presentación. Los que no estén usan el precio de la categoría.
  @OneToMany(() => PrecioVariedad, (p) => p.variedad)
  precios!: PrecioVariedad[];

  // null = hereda de la categoría; true/false = la pisa.
  @Column({ type: 'boolean', nullable: true })
  porEncargue!: boolean | null;

  // Siempre en la unidad más chica (milanesas sueltas, porciones).
  @Column({ type: 'int', default: 0 })
  stock!: number;

  // Dirección de la foto (Cloudinary o una de las iniciales en /fotos/ del front). null = sin foto.
  @Column({ type: 'varchar', nullable: true })
  foto!: string | null;

  // false = no aparece en el catálogo público.
  @Column({ default: true })
  visible!: boolean;
}

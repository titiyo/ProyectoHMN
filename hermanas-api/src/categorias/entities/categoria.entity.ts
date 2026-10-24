import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Variedad } from '../../variedades/entities/variedad.entity';

@Entity()
export class Categoria {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  nombre!: string;

  // true = sus variedades no se venden de stock, van siempre a encargue (ej. Garbanzo).
  @Column({ default: false })
  porEncargue!: boolean;

  // Precios en pesos enteros. null = todavía sin cargar.
  @Column({ type: 'int', nullable: true })
  precioUnidad!: number | null;

  @Column({ type: 'int', nullable: true })
  precioDocena!: number | null;

  @OneToMany(() => Variedad, (variedad) => variedad.categoria)
  variedades!: Variedad[];
}

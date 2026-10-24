import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Variedad } from '../../variedades/entities/variedad.entity';
import { Presentacion } from '../../presentaciones/entities/presentacion.entity';

@Entity()
export class Categoria {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  nombre!: string;

  // true = sus variedades no se venden de stock, van siempre a encargue.
  // Cada variedad puede pisarlo con su propio porEncargue.
  @Column({ default: false })
  porEncargue!: boolean;

  // Aclaración que se muestra en el catálogo (ej. "Todas contienen queso"). null = ninguna.
  @Column({ type: 'varchar', nullable: true })
  nota!: string | null;

  // Cómo se vende: unidad, docena, entera, porción... cada una con su precio.
  @OneToMany(() => Presentacion, (p) => p.categoria)
  presentaciones!: Presentacion[];

  @OneToMany(() => Variedad, (variedad) => variedad.categoria)
  variedades!: Variedad[];
}

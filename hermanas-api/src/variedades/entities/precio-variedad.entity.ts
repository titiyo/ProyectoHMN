import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Variedad } from './variedad.entity';
import { Presentacion } from '../../presentaciones/entities/presentacion.entity';

// Precio propio de una variedad para una presentación (pisa el de la categoría).
// Si no hay fila, se usa Presentacion.precio. Es una tabla "intermedia" con un dato extra.
@Entity()
@Unique(['variedadId', 'presentacionId'])
export class PrecioVariedad {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'variedad_id' })
  variedadId!: number;

  @ManyToOne(() => Variedad, (v) => v.precios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variedad_id' })
  variedad!: Variedad;

  @Column({ name: 'presentacion_id' })
  presentacionId!: number;

  @ManyToOne(() => Presentacion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'presentacion_id' })
  presentacion!: Presentacion;

  @Column({ type: 'int' })
  precio!: number;
}

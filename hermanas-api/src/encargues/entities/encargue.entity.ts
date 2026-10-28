import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DetalleEncargue } from './detalle-encargue.entity';

export type EstadoEncargue = 'pendiente' | 'listo' | 'entregado';
export const ESTADOS: EstadoEncargue[] = ['pendiente', 'listo', 'entregado'];

// Un pedido de un cliente que se elabora aparte. No toca el stock:
// las milanesas se hacen para ese cliente y se le entregan directo.
@Entity()
export class Encargue {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha!: Date;

  @Column()
  cliente!: string;

  @Column()
  telefono!: string;

  // Cuándo pasa a retirar, como texto libre ("jue 29/10, 11:30 a 13:30").
  // Opcional: los encargues viejos y los cargados sin fecha quedan en null.
  @Column({ type: 'varchar', length: 80, nullable: true })
  retiro!: string | null;

  @Column({ type: 'varchar', length: 12, default: 'pendiente' })
  estado!: EstadoEncargue;

  @OneToMany(() => DetalleEncargue, (detalle) => detalle.encargue)
  detalles!: DetalleEncargue[];
}

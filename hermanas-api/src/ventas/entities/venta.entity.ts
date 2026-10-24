import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DetalleVenta } from './detalle-venta.entity';
import { Encargue } from '../../encargues/entities/encargue.entity';

// Una venta es un "ticket": la cabecera (fecha, total, cliente) y sus renglones.
@Entity()
export class Venta {
  @PrimaryGeneratedColumn()
  id!: number;

  // La pone la base al insertar. timestamptz guarda el instante exacto, sin importar el huso.
  @CreateDateColumn({ type: 'timestamptz' })
  fecha!: Date;

  // Suma de los subtotales. Se calcula en el backend, nunca viene del front.
  @Column({ type: 'int' })
  total!: number;

  @Column({ type: 'varchar', nullable: true })
  cliente!: string | null;

  // Si la venta salió de entregar un encargue, cuál. null = venta de mostrador.
  // Sirve para no devolver stock al anularla (un encargue nunca descontó stock).
  @Column({ name: 'encargue_id', type: 'int', nullable: true, unique: true })
  encargueId!: number | null;

  @OneToOne(() => Encargue, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'encargue_id' })
  encargue!: Encargue | null;

  @OneToMany(() => DetalleVenta, (detalle) => detalle.venta)
  detalles!: DetalleVenta[];
}

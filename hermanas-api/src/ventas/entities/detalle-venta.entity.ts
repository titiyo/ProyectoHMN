import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Venta } from './venta.entity';
import { Variedad } from '../../variedades/entities/variedad.entity';

export type Modo = 'unidad' | 'docena';

// Un renglón del ticket. Guarda una COPIA del precio: si mañana cambia el precio,
// las ventas viejas siguen mostrando lo que se cobró.
@Entity()
export class DetalleVenta {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'venta_id' })
  ventaId!: number;

  @ManyToOne(() => Venta, (venta) => venta.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venta_id' })
  venta!: Venta;

  @Column({ name: 'variedad_id' })
  variedadId!: number;

  @ManyToOne(() => Variedad)
  @JoinColumn({ name: 'variedad_id' })
  variedad!: Variedad;

  // Si se vendió por unidad o por docena.
  @Column({ type: 'varchar', length: 10 })
  modo!: Modo;

  // Siempre en UNIDADES (2 docenas = 24). Es lo que se descontó del stock.
  @Column({ type: 'int' })
  cantidad!: number;

  // Precio del modo al momento de vender: precio de 1 unidad o de 1 docena.
  @Column({ type: 'int' })
  precioUnitario!: number;

  // precioUnitario × cantidad de unidades o de docenas.
  @Column({ type: 'int' })
  subtotal!: number;
}

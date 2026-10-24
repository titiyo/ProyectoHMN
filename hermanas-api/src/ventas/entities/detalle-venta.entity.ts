import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Venta } from './venta.entity';
import { Variedad } from '../../variedades/entities/variedad.entity';
import { Presentacion } from '../../presentaciones/entities/presentacion.entity';

// Un renglón del ticket. Guarda COPIAS (precio, nombre y tamaño de la presentación):
// si mañana cambia el precio, se renombra o se borra la presentación, las ventas
// viejas siguen mostrando lo que se cobró.
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

  // Referencia a la presentación; queda en null si después se borra.
  @Column({ name: 'presentacion_id', type: 'int', nullable: true })
  presentacionId!: number | null;

  @ManyToOne(() => Presentacion, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'presentacion_id' })
  presentacion!: Presentacion | null;

  // Copias al momento de vender: "docena", 12.
  @Column()
  presentacionNombre!: string;

  @Column({ type: 'int' })
  unidadesPorPresentacion!: number;

  // Siempre en UNIDADES DE STOCK (2 docenas = 24). Es lo que se descontó del stock.
  @Column({ type: 'int' })
  cantidad!: number;

  // Precio de UNA presentación al momento de vender (de 1 docena, de 1 tarta entera...).
  @Column({ type: 'int' })
  precioUnitario!: number;

  // precioUnitario × cantidad de presentaciones.
  @Column({ type: 'int' })
  subtotal!: number;
}

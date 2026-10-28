import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Variedad } from '../../variedades/entities/variedad.entity';

export type EstadoPedidoWeb = 'nuevo' | 'encargue' | 'descartado';

// Pedido que un cliente arma en el carrito de la página y manda por WhatsApp.
// NO toca stock ni crea nada solo: la vendedora lo confirma por chat y lo pasa a encargue.
@Entity()
export class PedidoWeb {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha!: Date;

  @Column()
  cliente!: string;

  @Column({ type: 'varchar', nullable: true })
  telefono!: string | null;

  // Texto tal como lo eligió el cliente ("sáb 1/11", "10:00 a 11:30").
  @Column()
  dia!: string;

  @Column()
  horario!: string;

  // Por ahora solo "retiro"; queda el campo para sumar envíos más adelante.
  @Column({ type: 'varchar', length: 12, default: 'retiro' })
  entrega!: string;

  @Column({ type: 'varchar', length: 12, default: 'nuevo' })
  estado!: EstadoPedidoWeb;

  // Total estimado con los precios del momento (sin las que no tenían precio).
  @Column({ type: 'int' })
  totalEstimado!: number;

  // El encargue que se creó al pasarlo (null mientras no se pasó).
  @Column({ name: 'encargue_id', type: 'int', nullable: true })
  encargueId!: number | null;

  @OneToMany(() => DetallePedidoWeb, (d) => d.pedido)
  detalles!: DetallePedidoWeb[];
}

@Entity()
export class DetallePedidoWeb {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'pedido_id' })
  pedidoId!: number;

  @ManyToOne(() => PedidoWeb, (p) => p.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pedido_id' })
  pedido!: PedidoWeb;

  @Column({ name: 'variedad_id' })
  variedadId!: number;

  @ManyToOne(() => Variedad, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variedad_id' })
  variedad!: Variedad;

  // Referencia a la presentación (para pasarlo a encargue) + copias para mostrarlo
  // aunque después cambien nombres o precios.
  @Column({ name: 'presentacion_id', type: 'int' })
  presentacionId!: number;

  @Column()
  descripcion!: string; // "Milanesas de soja rellenas — Brócoli"

  @Column()
  presentacionNombre!: string;

  // En presentaciones (2 docenas = 2), como lo pidió el cliente.
  @Column({ type: 'int' })
  cantidad!: number;

  @Column({ type: 'int', nullable: true })
  precioUnitario!: number | null;

  // Estaba agotada al pedir: la vendedora confirma si llega a hacerla.
  @Column({ default: false })
  aPreguntar!: boolean;
}

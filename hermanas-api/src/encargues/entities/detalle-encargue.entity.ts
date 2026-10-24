import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Encargue } from './encargue.entity';
import { Variedad } from '../../variedades/entities/variedad.entity';
import type { Modo } from '../../ventas/entities/detalle-venta.entity';

// Renglón del encargue. NO guarda precio: el precio se fija al entregar.
@Entity()
export class DetalleEncargue {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'encargue_id' })
  encargueId!: number;

  @ManyToOne(() => Encargue, (encargue) => encargue.detalles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'encargue_id' })
  encargue!: Encargue;

  @Column({ name: 'variedad_id' })
  variedadId!: number;

  @ManyToOne(() => Variedad)
  @JoinColumn({ name: 'variedad_id' })
  variedad!: Variedad;

  // Para cobrar precio de docena al entregar si se pidió por docena.
  @Column({ type: 'varchar', length: 10 })
  modo!: Modo;

  // Siempre en UNIDADES (1 docena = 12), igual que en DetalleVenta.
  @Column({ type: 'int' })
  cantidad!: number;
}

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Encargue } from './encargue.entity';
import { Variedad } from '../../variedades/entities/variedad.entity';
import { Presentacion } from '../../presentaciones/entities/presentacion.entity';

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

  // Para cobrar al entregar con el precio de esta presentación. null si se borró
  // (solo puede pasar en encargues ya entregados: el borrado lo impide si no).
  @Column({ name: 'presentacion_id', type: 'int', nullable: true })
  presentacionId!: number | null;

  @ManyToOne(() => Presentacion, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'presentacion_id' })
  presentacion!: Presentacion | null;

  // Copia del tamaño de la presentación al encargar. Si después la tarta pasa de 4 a 6
  // porciones, este encargue se sigue cobrando por las tartas que se pidieron.
  @Column({ type: 'int', default: 1 })
  unidadesPorPresentacion!: number;

  // Total pedido, en UNIDADES DE STOCK (1 docena = 12).
  @Column({ type: 'int' })
  cantidad!: number;

  // Cuántas de esas ya están hechas: las que se reservaron del stock al crear el encargue.
  // "Por hacer" muestra cantidad - cantidadPreparada. Si se cancela, vuelven al stock.
  @Column({ type: 'int', default: 0 })
  cantidadPreparada!: number;
}

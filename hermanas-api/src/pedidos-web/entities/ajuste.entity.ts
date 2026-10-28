import { Column, Entity, PrimaryColumn } from 'typeorm';

// Ajustes generales del negocio como pares clave → valor (texto).
// Hoy solo "recibirPedidosWeb" ('true' | 'false'); sirve para sumar más sin tablas nuevas.
@Entity()
export class Ajuste {
  @PrimaryColumn()
  clave!: string;

  @Column()
  valor!: string;
}

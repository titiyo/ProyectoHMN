import { RenglonPedido } from '../../common/detalles';

export class CreateEncargueDto {
  cliente!: string;
  telefono!: string;
  retiro?: string | null; // opcional: "jue 29/10, 11:30 a 13:30"
  detalles!: RenglonPedido[];
}

// Solo se editan los datos de contacto y el retiro; para cambiar lo pedido se cancela y se rehace.
export class UpdateEncargueDto {
  cliente?: string;
  telefono?: string;
  retiro?: string | null;
}

import { RenglonPedido } from '../../common/detalles';

export class CreateEncargueDto {
  cliente!: string;
  telefono!: string;
  detalles!: RenglonPedido[];
}

// Solo se editan los datos de contacto; para cambiar lo pedido se cancela y se rehace.
export class UpdateEncargueDto {
  cliente?: string;
  telefono?: string;
}

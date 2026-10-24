import { RenglonPedido } from '../../common/detalles';

export class CreateVentaDto {
  cliente?: string | null;
  detalles!: RenglonPedido[];
  // true = si no alcanza el stock (o es variedad por encargue), vender lo que hay
  // y crear un encargue por el resto. Ahí cliente y telefono son obligatorios.
  encargarFaltante?: boolean;
  telefono?: string;
}

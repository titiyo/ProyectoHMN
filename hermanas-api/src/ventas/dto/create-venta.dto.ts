import { RenglonPedido } from '../../common/detalles';

// Qué hacer si algún renglón no alcanza con el stock (o es por encargue):
//   'reservar' = todo el pedido pasa a encargue; lo que hay en stock se reserva (ya está hecho)
//   'hacer'    = todo el pedido pasa a encargue; no se toca el stock, se hace todo
// Sin "faltante", si algo no alcanza la API responde 409 y no guarda nada.
export type OpcionFaltante = 'reservar' | 'hacer';

export class CreateVentaDto {
  cliente?: string | null;
  telefono?: string; // obligatorio con "faltante" (para avisar cuando esté)
  faltante?: OpcionFaltante;
  detalles!: RenglonPedido[];
}

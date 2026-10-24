import { BadRequestException } from '@nestjs/common';
import { validarCampos, validarEntero } from './validaciones';

// Renglón tal como lo manda el front: cantidad en la presentación elegida
// (2 con la presentación "docena" = 2 docenas).
export interface RenglonPedido {
  variedadId: number;
  presentacionId: number;
  cantidad: number;
}

const MAX_RENGLONES = 50;

// Valida la lista "detalles" de una venta o un encargue y la devuelve limpia.
export function validarDetalles(detalles: unknown): RenglonPedido[] {
  if (
    !Array.isArray(detalles) ||
    detalles.length === 0 ||
    detalles.length > MAX_RENGLONES
  ) {
    throw new BadRequestException(
      `detalles debe ser una lista de 1 a ${MAX_RENGLONES} renglones`,
    );
  }
  return detalles.map((item: RenglonPedido, i) => {
    const donde = `detalles[${i}]`;
    validarCampos(item, ['variedadId', 'presentacionId', 'cantidad']);
    const cantidad = validarEntero(item.cantidad, `${donde}.cantidad`);
    if (cantidad === 0 || cantidad > 10000) {
      throw new BadRequestException(`${donde}.cantidad debe estar entre 1 y 10000`);
    }
    return {
      variedadId: validarEntero(item.variedadId, `${donde}.variedadId`),
      presentacionId: validarEntero(item.presentacionId, `${donde}.presentacionId`),
      cantidad,
    };
  });
}

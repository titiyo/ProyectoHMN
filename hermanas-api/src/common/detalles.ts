import { BadRequestException } from '@nestjs/common';
import { validarCampos, validarEntero } from './validaciones';
import { Modo } from '../ventas/entities/detalle-venta.entity';

// Renglón tal como lo manda el front: cantidad en el modo elegido (2 docenas = 2).
export interface RenglonPedido {
  variedadId: number;
  modo: Modo;
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
    validarCampos(item, ['variedadId', 'modo', 'cantidad']);
    if (item.modo !== 'unidad' && item.modo !== 'docena') {
      throw new BadRequestException(`${donde}.modo debe ser "unidad" o "docena"`);
    }
    const cantidad = validarEntero(item.cantidad, `${donde}.cantidad`);
    if (cantidad === 0 || cantidad > 10000) {
      throw new BadRequestException(`${donde}.cantidad debe estar entre 1 y 10000`);
    }
    return {
      variedadId: validarEntero(item.variedadId, `${donde}.variedadId`),
      modo: item.modo,
      cantidad,
    };
  });
}

import { BadRequestException } from '@nestjs/common';
import { Variedad } from '../variedades/entities/variedad.entity';
import { Modo } from '../ventas/entities/detalle-venta.entity';

// Unidades que descuenta del stock cada modo.
export const UNIDADES_POR_MODO: Record<Modo, number> = { unidad: 1, docena: 12 };

// Precio efectivo = el de la variedad si tiene, si no el de su categoría.
// "??" solo salta al segundo valor cuando el primero es null/undefined (un 0 se respeta).
// La variedad tiene que venir con su categoría cargada.
export function precioEfectivo(variedad: Variedad, modo: Modo): number | null {
  if (modo === 'unidad') {
    return variedad.precioUnidad ?? variedad.categoria.precioUnidad;
  }
  return variedad.precioDocena ?? variedad.categoria.precioDocena;
}

// Igual que precioEfectivo pero corta con 400 si no hay precio cargado.
export function precioObligatorio(variedad: Variedad, modo: Modo): number {
  const precio = precioEfectivo(variedad, modo);
  if (precio === null) {
    throw new BadRequestException(
      `"${variedad.nombre}" no tiene precio por ${modo} cargado.`,
    );
  }
  return precio;
}

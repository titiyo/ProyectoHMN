import { BadRequestException } from '@nestjs/common';
import { Variedad } from '../variedades/entities/variedad.entity';
import { Presentacion } from '../presentaciones/entities/presentacion.entity';

// Precio efectivo = el propio de la variedad para esa presentación si tiene,
// si no el de la presentación (de la categoría). null = sin precio.
// La variedad tiene que venir con "precios" cargado.
export function precioEfectivo(
  variedad: Variedad,
  presentacion: Presentacion,
): number | null {
  const propio = variedad.precios?.find((p) => p.presentacionId === presentacion.id);
  return propio?.precio ?? presentacion.precio;
}

// Igual pero corta con 400 si no hay precio cargado.
export function precioObligatorio(variedad: Variedad, presentacion: Presentacion): number {
  const precio = precioEfectivo(variedad, presentacion);
  if (precio === null) {
    throw new BadRequestException(
      `"${variedad.nombre}" no tiene precio por ${presentacion.nombre} cargado.`,
    );
  }
  return precio;
}

// ¿Se vende por encargue? Lo de la variedad pisa lo de la categoría.
// "??" solo usa la categoría cuando la variedad tiene null (un false propio se respeta).
// La variedad tiene que venir con "categoria" cargada.
export function esPorEncargue(variedad: Variedad): boolean {
  return variedad.porEncargue ?? variedad.categoria.porEncargue;
}

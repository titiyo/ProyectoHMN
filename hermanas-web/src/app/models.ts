// Formas de los datos que devuelve la API. Copian las entidades del backend.

export type EstadoEncargue = 'pendiente' | 'listo' | 'entregado';

// Forma de vender una categoría: unidad (1), docena (12), porción (1), entera (4)...
// "unidades" = cuántas unidades de stock descuenta.
export interface Presentacion {
  id: number;
  categoriaId: number;
  nombre: string;
  unidades: number;
  precio: number | null;
  orden: number;
}

export interface Categoria {
  id: number;
  nombre: string;
  porEncargue: boolean;
  nota: string | null;
  presentaciones: Presentacion[]; // ordenadas de la más chica a la más grande
}

export interface PrecioVariedad {
  id: number;
  variedadId: number;
  presentacionId: number;
  precio: number;
}

export interface Variedad {
  id: number;
  nombre: string;
  categoriaId: number;
  categoria: Categoria; // sin presentaciones: esas se toman de la lista de categorías
  precios: PrecioVariedad[]; // precios propios (pisan los de la categoría)
  porEncargue: boolean | null; // null = hereda de la categoría
  stock: number; // en la unidad más chica
  visible: boolean;
}

export interface DetalleVenta {
  id: number;
  variedadId: number;
  variedad: Variedad;
  presentacionId: number | null;
  presentacionNombre: string; // copia al vender
  unidadesPorPresentacion: number;
  cantidad: number; // en unidades de stock
  precioUnitario: number; // de una presentación
  subtotal: number;
}

export interface Venta {
  id: number;
  fecha: string; // la API manda la fecha como texto ISO
  total: number;
  cliente: string | null;
  encargueId: number | null;
  detalles: DetalleVenta[];
}

export interface DetalleEncargue {
  id: number;
  variedadId: number;
  variedad: Variedad;
  presentacionId: number | null;
  presentacion: Presentacion | null;
  unidadesPorPresentacion: number;
  cantidad: number; // en unidades de stock
  cantidadPreparada: number; // reservadas del stock (ya hechas)
}

export interface Encargue {
  id: number;
  fecha: string;
  cliente: string;
  telefono: string;
  estado: EstadoEncargue;
  detalles: DetalleEncargue[];
}

export interface PorHacer {
  variedades: {
    variedadId: number;
    nombre: string;
    subtotal: number; // lo que falta preparar
    encargues: {
      encargueId: number;
      cliente: string;
      telefono: string;
      fecha: string;
      presentacion: string;
      cantidad: number;
      preparada: number;
      faltan: number;
    }[];
  }[];
  total: number;
}

// Renglón tal como se manda al crear una venta o un encargue
// (cantidad en la presentación elegida: 2 docenas = 2).
export interface RenglonPedido {
  variedadId: number;
  presentacionId: number;
  cantidad: number;
}

// Precio efectivo: el propio de la variedad, y si no tiene, el de la presentación.
// Es la misma regla que aplica el backend; acá solo se usa para mostrar.
export function precioEfectivo(v: Variedad, p: Presentacion): number | null {
  return v.precios.find((x) => x.presentacionId === p.id)?.precio ?? p.precio;
}

// ¿Se vende por encargue? Lo de la variedad pisa lo de la categoría.
export function esPorEncargue(v: Variedad): boolean {
  return v.porEncargue ?? v.categoria.porEncargue;
}

// Expresa unidades de stock con la presentación más grande que entre:
// 26 milanesas → "2 docena + 2 u"; 9 porciones (entera = 4) → "2 entera + 1 u".
export function enPresentaciones(unidades: number, presentaciones: Presentacion[]): string {
  const grande = [...presentaciones].sort((a, b) => b.unidades - a.unidades)[0];
  if (!grande || grande.unidades <= 1) return `${unidades} u`;
  const cuantas = Math.floor(unidades / grande.unidades);
  const resto = unidades % grande.unidades;
  if (cuantas === 0) return `${resto} u`;
  return resto === 0 ? `${cuantas} ${grande.nombre}` : `${cuantas} ${grande.nombre} + ${resto} u`;
}

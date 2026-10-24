// Formas de los datos que devuelve la API. Copian las entidades del backend.

export type Modo = 'unidad' | 'docena';
export type EstadoEncargue = 'pendiente' | 'listo' | 'entregado';

export const UNIDADES_POR_MODO: Record<Modo, number> = { unidad: 1, docena: 12 };

export interface Categoria {
  id: number;
  nombre: string;
  porEncargue: boolean;
  precioUnidad: number | null;
  precioDocena: number | null;
}

export interface Variedad {
  id: number;
  nombre: string;
  categoriaId: number;
  categoria: Categoria;
  precioUnidad: number | null;
  precioDocena: number | null;
  stock: number;
  visible: boolean;
}

export interface DetalleVenta {
  id: number;
  variedadId: number;
  variedad: Variedad;
  modo: Modo;
  cantidad: number; // en unidades
  precioUnitario: number;
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
  modo: Modo;
  cantidad: number; // en unidades
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
    subtotal: number;
    encargues: {
      encargueId: number;
      cliente: string;
      telefono: string;
      fecha: string;
      modo: Modo;
      cantidad: number;
    }[];
  }[];
  total: number;
}

// Renglón tal como se manda al crear una venta o un encargue
// (cantidad en el modo elegido: 2 docenas = 2).
export interface RenglonPedido {
  variedadId: number;
  modo: Modo;
  cantidad: number;
}

// Precio efectivo: el de la variedad, y si no tiene, el de su categoría.
// Es la misma regla que aplica el backend; acá solo se usa para mostrar.
export function precioEfectivo(v: Variedad, modo: Modo): number | null {
  return modo === 'unidad'
    ? (v.precioUnidad ?? v.categoria.precioUnidad)
    : (v.precioDocena ?? v.categoria.precioDocena);
}

// "26" unidades → "2 doc + 2 u" para leerlo rápido.
export function enDocenas(unidades: number): string {
  const doc = Math.floor(unidades / 12);
  const u = unidades % 12;
  if (doc === 0) return `${u} u`;
  return u === 0 ? `${doc} doc` : `${doc} doc + ${u} u`;
}

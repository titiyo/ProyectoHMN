import { BadRequestException } from '@nestjs/common';

// Máximo de una columna int de Postgres: un número más grande rompe la consulta.
export const MAX_INT = 2147483647;

// Dos nombres son el mismo si coinciden sin contar espacios ni mayúsculas.
export function normalizar(nombre: string) {
  return nombre.trim().toLowerCase();
}

// El body tiene que ser un objeto y solo puede traer los campos permitidos.
// Un "id" en el body haría que save() pise otro registro.
export function validarCampos(dto: unknown, permitidos: string[]) {
  if (!dto || typeof dto !== 'object' || Array.isArray(dto)) {
    throw new BadRequestException('el body debe ser un objeto JSON');
  }
  const errores: string[] = [];
  for (const campo of Object.keys(dto)) {
    if (campo === 'id') {
      errores.push('el id no se puede enviar en el body');
    } else if (!permitidos.includes(campo)) {
      errores.push(`campo no permitido: ${campo}`);
    }
  }
  if (errores.length > 0) {
    throw new BadRequestException(errores);
  }
}

export function validarTexto(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new BadRequestException(`${campo} debe ser un texto no vacío`);
  }
  return valor.trim();
}

// Texto que se puede borrar: null o "" (o solo espacios) = sin texto.
export function validarTextoOpcional(valor: unknown, campo: string): string | null {
  if (valor === null) return null;
  if (typeof valor !== 'string' || valor.length > 200) {
    throw new BadRequestException(`${campo} debe ser un texto de hasta 200 caracteres o null`);
  }
  return valor.trim() === '' ? null : valor.trim();
}

// Booleano que se puede "vaciar": null = hereda (ej. porEncargue de una variedad).
export function validarBooleanoOpcional(valor: unknown, campo: string): boolean | null {
  return valor === null ? null : validarBooleano(valor, campo);
}

export function validarBooleano(valor: unknown, campo: string): boolean {
  if (typeof valor !== 'boolean') {
    throw new BadRequestException(`${campo} debe ser true o false`);
  }
  return valor;
}

// Entero >= 0 (precios en pesos, stock en unidades).
export function validarEntero(valor: unknown, campo: string): number {
  if (
    typeof valor !== 'number' ||
    !Number.isInteger(valor) ||
    valor < 0 ||
    valor > MAX_INT
  ) {
    throw new BadRequestException(`${campo} debe ser un entero mayor o igual a 0`);
  }
  return valor;
}

// Precio opcional: null significa "sin precio cargado". Si viene, tiene que ser > 0:
// un precio en $0 casi siempre es un error de carga y dejaría vender gratis.
export function validarPrecio(valor: unknown, campo: string): number | null {
  if (valor === null) return null;
  const precio = validarEntero(valor, campo);
  if (precio === 0) {
    throw new BadRequestException(`${campo} debe ser mayor a 0 (dejalo vacío si todavía no tiene precio)`);
  }
  return precio;
}

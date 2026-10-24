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

// Precio opcional: null significa "sin precio propio".
export function validarPrecio(valor: unknown, campo: string): number | null {
  return valor === null ? null : validarEntero(valor, campo);
}

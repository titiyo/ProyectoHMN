import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export interface Aviso {
  id: number;
  tipo: 'success' | 'danger';
  texto: string;
}

// Mensajes al usuario ("Venta registrada", "Stock insuficiente..."), que se muestran
// arriba a la derecha en toda la app y se cierran solos.
@Injectable({ providedIn: 'root' })
export class AvisosService {
  readonly avisos = signal<Aviso[]>([]);
  private siguienteId = 1;

  exito(texto: string) {
    this.agregar('success', texto);
  }

  // Acepta el error de HttpClient directo y saca un texto entendible.
  error(err: unknown) {
    this.agregar('danger', mensajeDeError(err));
  }

  cerrar(id: number) {
    this.avisos.update((lista) => lista.filter((a) => a.id !== id));
  }

  private agregar(tipo: Aviso['tipo'], texto: string) {
    const id = this.siguienteId++;
    this.avisos.update((lista) => [...lista, { id, tipo, texto }]);
    setTimeout(() => this.cerrar(id), tipo === 'success' ? 3000 : 6000);
  }
}

// NestJS responde los errores como { message: "texto" } o { message: ["a", "b"] }.
export function mensajeDeError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      // Sin respuesta: la API está caída o (en Render gratis) despertándose.
      return 'No se pudo conectar con el servidor. Si recién arranca, esperá un minuto y probá de nuevo.';
    }
    const mensaje = err.error?.message;
    if (Array.isArray(mensaje)) return mensaje.join('. ');
    if (typeof mensaje === 'string') return mensaje;
  }
  return 'Ocurrió un error inesperado.';
}

// Para las cargas de fondo: el 401 ya lo maneja el interceptor (manda al login);
// cualquier otro error se muestra como aviso.
export function avisarSiNo401(avisos: AvisosService) {
  return (err: unknown) => {
    if (!(err instanceof HttpErrorResponse && err.status === 401)) avisos.error(err);
  };
}

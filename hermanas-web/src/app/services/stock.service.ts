import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Categoria, Presentacion, Variedad } from '../models';
import { AvisosService, avisarSiNo401 } from './avisos.service';

// Guarda en memoria las categorías y variedades (con su stock).
// Todos los componentes leen de estos signals: cuando cambian (por un +/-, una venta,
// una edición), TODOS los que los muestran se actualizan solos.
@Injectable({ providedIn: 'root' })
export class StockService {
  private http = inject(HttpClient);
  private url = environment.apiUrl;
  private avisos = inject(AvisosService);

  readonly categorias = signal<Categoria[]>([]);
  readonly variedades = signal<Variedad[]>([]);

  // computed = valor derivado: se recalcula solo cuando cambia alguno de los signals que lee.
  readonly porCategoria = computed(() =>
    this.categorias().map((categoria) => ({
      categoria,
      variedades: this.variedades().filter((v) => v.categoriaId === categoria.id),
    })),
  );

  // Pide todo de nuevo a la API (al entrar al panel o después de una venta).
  cargar() {
    this.http
      .get<Categoria[]>(`${this.url}/categorias`)
      .subscribe({ next: (c) => this.categorias.set(c), error: avisarSiNo401(this.avisos) });
    this.http
      .get<Variedad[]>(`${this.url}/variedades`)
      .subscribe({ next: (v) => this.variedades.set(v), error: avisarSiNo401(this.avisos) });
  }

  // Botones +/-. Con la respuesta reemplazo solo esa variedad en la lista.
  ajustarStock(id: number, delta: number): Observable<Variedad> {
    return this.http
      .patch<Variedad>(`${this.url}/variedades/${id}/stock`, { delta })
      .pipe(tap((v) => this.reemplazar(v)));
  }

  // ---- Configuración ----

  // En el alta van las presentaciones iniciales (al menos una), sin id todavía.
  crearCategoria(datos: Omit<Partial<Categoria>, 'presentaciones'> & { presentaciones: Partial<Presentacion>[] }) {
    return this.http
      .post<Categoria>(`${this.url}/categorias`, datos)
      .pipe(tap(() => this.cargar()));
  }

  // Al cambiar el precio de una categoría cambia el precio efectivo de sus variedades,
  // por eso recargo todo.
  editarCategoria(id: number, datos: Partial<Categoria>) {
    return this.http
      .patch<Categoria>(`${this.url}/categorias/${id}`, datos)
      .pipe(tap(() => this.cargar()));
  }

  eliminarCategoria(id: number) {
    return this.http
      .delete(`${this.url}/categorias/${id}`)
      .pipe(tap(() => this.cargar()));
  }

  crearVariedad(datos: Partial<Variedad>) {
    return this.http
      .post<Variedad>(`${this.url}/variedades`, datos)
      .pipe(tap((v) => this.variedades.update((lista) => [...lista, v])));
  }

  editarVariedad(id: number, datos: Partial<Variedad>) {
    return this.http
      .patch<Variedad>(`${this.url}/variedades/${id}`, datos)
      .pipe(tap((v) => this.reemplazar(v)));
  }

  eliminarVariedad(id: number) {
    return this.http
      .delete(`${this.url}/variedades/${id}`)
      .pipe(
        tap(() => this.variedades.update((l) => l.filter((v) => v.id !== id))),
      );
  }

  // Presentaciones de la categoría de una variedad (vienen con la lista de categorías).
  presentacionesDe(categoriaId: number | null | undefined): Presentacion[] {
    return this.categorias().find((c) => c.id === categoriaId)?.presentaciones ?? [];
  }

  // ---- Presentaciones ----
  // Cambian precios o tamaños: recargo todo para que el panel vea los valores nuevos.

  crearPresentacion(datos: Partial<Presentacion>) {
    return this.http
      .post<Presentacion>(`${this.url}/presentaciones`, datos)
      .pipe(tap(() => this.cargar()));
  }

  editarPresentacion(id: number, datos: Partial<Presentacion>) {
    return this.http
      .patch<Presentacion>(`${this.url}/presentaciones/${id}`, datos)
      .pipe(tap(() => this.cargar()));
  }

  eliminarPresentacion(id: number) {
    return this.http
      .delete(`${this.url}/presentaciones/${id}`)
      .pipe(tap(() => this.cargar()));
  }

  private reemplazar(nueva: Variedad) {
    this.variedades.update((lista) =>
      lista.map((v) => (v.id === nueva.id ? nueva : v)),
    );
  }
}

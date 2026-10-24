import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Categoria, Variedad } from '../models';
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

  crearCategoria(datos: Partial<Categoria>) {
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

  private reemplazar(nueva: Variedad) {
    this.variedades.update((lista) =>
      lista.map((v) => (v.id === nueva.id ? nueva : v)),
    );
  }
}

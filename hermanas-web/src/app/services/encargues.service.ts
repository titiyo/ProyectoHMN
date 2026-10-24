import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Encargue, EstadoEncargue, PorHacer, RenglonPedido, Venta } from '../models';

@Injectable({ providedIn: 'root' })
export class EncarguesService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/encargues`;

  readonly porHacer = signal<PorHacer>({ variedades: [], total: 0 });

  cargarPorHacer() {
    this.http
      .get<PorHacer>(`${this.url}/por-hacer`)
      .subscribe((p) => this.porHacer.set(p));
  }

  listar(estado?: EstadoEncargue) {
    const params = estado ? new HttpParams().set('estado', estado) : undefined;
    return this.http.get<Encargue[]>(this.url, { params });
  }

  crear(datos: { cliente: string; telefono: string; detalles: RenglonPedido[] }) {
    return this.http
      .post<Encargue>(this.url, datos)
      .pipe(tap(() => this.cargarPorHacer()));
  }

  // Al pasar a "entregado" la API crea la venta y la devuelve en "venta".
  cambiarEstado(id: number, estado: EstadoEncargue) {
    return this.http
      .patch<{ encargue: Encargue; venta: Venta | null }>(
        `${this.url}/${id}/estado`,
        { estado },
      )
      .pipe(tap(() => this.cargarPorHacer()));
  }

  cancelar(id: number) {
    return this.http
      .delete(`${this.url}/${id}`)
      .pipe(tap(() => this.cargarPorHacer()));
  }
}


import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Encargue, RenglonPedido, Venta } from '../models';
import { StockService } from './stock.service';
import { EncarguesService } from './encargues.service';
import { AvisosService, avisarSiNo401 } from './avisos.service';

export interface NuevaVenta {
  cliente?: string;
  telefono?: string;
  faltante?: 'reservar' | 'hacer';
  detalles: RenglonPedido[];
}

@Injectable({ providedIn: 'root' })
export class VentasService {
  private http = inject(HttpClient);
  private stock = inject(StockService);
  private encargues = inject(EncarguesService);
  private avisos = inject(AvisosService);
  private url = `${environment.apiUrl}/ventas`;

  // Las últimas ventas del día, para el tablero.
  readonly ultimas = signal<Venta[]>([]);

  cargarUltimas() {
    this.listar(hoy(), hoy()).subscribe({
      next: (v) => this.ultimas.set(v.slice(0, 6)),
      error: avisarSiNo401(this.avisos),
    });
  }

  // desde/hasta en formato dd-mm-yyyy, como los espera la API.
  listar(desde?: string, hasta?: string) {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<Venta[]>(this.url, { params });
  }

  // Después de vender cambia el stock, las últimas ventas y (si hubo faltante) "Por hacer".
  registrar(venta: NuevaVenta) {
    return this.http
      .post<{ venta: Venta | null; encargue: Encargue | null }>(this.url, venta)
      .pipe(tap(() => this.refrescarTodo()));
  }

  anular(id: number) {
    return this.http
      .delete(`${this.url}/${id}`)
      .pipe(tap(() => this.refrescarTodo()));
  }

  private refrescarTodo() {
    this.stock.cargar();
    this.cargarUltimas();
    this.encargues.cargarPorHacer();
  }
}

// Fecha de hoy como dd-mm-yyyy (en la hora de la compu, que es la de Argentina).
export function hoy(): string {
  const d = new Date();
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(d.getDate())}-${dos(d.getMonth() + 1)}-${d.getFullYear()}`;
}

// El <input type="date"> da yyyy-mm-dd; la API quiere dd-mm-yyyy.
export function aFormatoApi(fechaInput: string): string {
  const [yyyy, mm, dd] = fechaInput.split('-');
  return `${dd}-${mm}-${yyyy}`;
}

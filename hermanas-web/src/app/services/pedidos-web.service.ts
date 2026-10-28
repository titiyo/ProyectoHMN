import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AvisosService, avisarSiNo401 } from './avisos.service';

export type EstadoPedidoWeb = 'nuevo' | 'encargue' | 'descartado';

export interface PedidoWeb {
  id: number;
  fecha: string;
  cliente: string;
  telefono: string | null;
  dia: string;
  horario: string;
  entrega: string;
  estado: EstadoPedidoWeb;
  totalEstimado: number;
  encargueId: number | null;
  detalles: {
    id: number;
    descripcion: string;
    presentacionNombre: string;
    cantidad: number;
    precioUnitario: number | null;
    aPreguntar: boolean;
  }[];
}

// Pedidos que llegan del carrito de la tienda (ver tienda/carrito-panel).
@Injectable({ providedIn: 'root' })
export class PedidosWebService {
  private http = inject(HttpClient);
  private avisos = inject(AvisosService);
  private url = `${environment.apiUrl}/pedidos-web`;

  // Cantidad de pedidos nuevos: para el número rojo del menú y el tablero.
  readonly nuevos = signal(0);

  cargarNuevos() {
    this.http.get<{ nuevos: number }>(`${this.url}/nuevos`).subscribe({
      next: (r) => this.nuevos.set(r.nuevos),
      error: avisarSiNo401(this.avisos),
    });
  }

  listar(estado: EstadoPedidoWeb) {
    return this.http.get<PedidoWeb[]>(this.url, { params: new HttpParams().set('estado', estado) });
  }

  pasarAEncargue(id: number) {
    return this.http
      .post<{ message: string; encargueId: number }>(`${this.url}/${id}/encargue`, {})
      .pipe(tap(() => this.cargarNuevos()));
  }

  descartar(id: number) {
    return this.http
      .patch<{ message: string }>(`${this.url}/${id}/descartar`, {})
      .pipe(tap(() => this.cargarNuevos()));
  }

  recibe() {
    return this.http.get<{ recibirPedidosWeb: boolean }>(`${this.url}/ajustes`);
  }

  cambiarRecibe(valor: boolean) {
    return this.http.patch<{ recibirPedidosWeb: boolean }>(`${this.url}/ajustes`, { recibirPedidosWeb: valor });
  }
}

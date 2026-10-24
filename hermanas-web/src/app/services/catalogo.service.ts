import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface ItemCatalogo {
  nombre: string;
  precioUnidad: number | null; // null = consultar
  precioDocena: number | null;
  estado: 'disponible' | 'agotado' | 'encargue';
}

export interface CategoriaCatalogo {
  nombre: string;
  porEncargue: boolean;
  variedades: ItemCatalogo[];
}

// Solo lectura y sin login: usa el endpoint público /catalogo, que nunca manda el stock.
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private http = inject(HttpClient);

  obtener() {
    return this.http.get<CategoriaCatalogo[]>(`${environment.apiUrl}/catalogo`);
  }
}

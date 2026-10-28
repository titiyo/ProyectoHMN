import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { mensajeDeError } from './avisos.service';

export type EstadoCatalogo = 'disponible' | 'agotado' | 'encargue';

export interface PrecioCatalogo {
  presentacionId: number;
  presentacion: string; // "unidad", "docena", "entera"...
  unidades: number;
  precio: number | null; // null = consultar
}

export interface ItemCatalogo {
  id: number;
  nombre: string;
  foto: string | null;
  estado: EstadoCatalogo;
  precios: PrecioCatalogo[];
}

export interface CategoriaCatalogo {
  id: number;
  slug: string; // para la dirección: /milanesas-de-soja-rellenas
  nombre: string;
  nota: string | null; // aclaración editable desde Configuración
  variedades: ItemCatalogo[];
}

// Solo lectura y sin login: usa el endpoint público /catalogo, que nunca manda el stock.
// Lo carga una vez y lo comparten la portada, las páginas de categoría y el carrito.
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private http = inject(HttpClient);

  readonly categorias = signal<CategoriaCatalogo[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  private cargado = false;

  cargar(forzar = false) {
    if ((this.cargado && !forzar) || this.cargando()) return;
    this.cargando.set(true);
    this.error.set(null);
    this.http.get<CategoriaCatalogo[]>(`${environment.apiUrl}/catalogo`).subscribe({
      next: (c) => {
        this.categorias.set(c);
        this.cargado = true;
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }

  // Disponibles primero, después a encargar, al final las agotadas ("a preguntar").
  ordenar(items: ItemCatalogo[]) {
    const peso: Record<EstadoCatalogo, number> = { disponible: 0, encargue: 1, agotado: 2 };
    return [...items].sort((a, b) => peso[a.estado] - peso[b.estado]);
  }
}

// Precio en pesos para mostrar: "$ 9.800".
export function pesos(n: number) {
  return '$ ' + n.toLocaleString('es-AR');
}

import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CatalogoService, CategoriaCatalogo, ItemCatalogo, PrecioCatalogo, pesos } from './catalogo.service';

// Lo que se guarda: solo ids y cantidades. Nombres y precios se toman SIEMPRE del
// catálogo actual, así un precio viejo guardado en el navegador nunca aparece.
interface LineaGuardada {
  variedadId: number;
  presentacionId: number;
  cantidad: number; // en presentaciones (2 docenas = 2)
}

export interface LineaCarrito extends LineaGuardada {
  item: ItemCatalogo;
  categoria: CategoriaCatalogo;
  precio: PrecioCatalogo;
  subtotal: number;
}

export interface DatosRetiro {
  nombre: string;
  dia: string;
  horario: string;
  telefono: string;
}

const CLAVE = 'hermanas_carrito';

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private http = inject(HttpClient);
  private catalogo = inject(CatalogoService);

  private guardadas = signal<LineaGuardada[]>(leer());
  readonly abierto = signal(false);

  // Une lo guardado con el catálogo. Si algo ya no existe (se ocultó o borró), se ignora.
  readonly lineas = computed<LineaCarrito[]>(() => {
    const cats = this.catalogo.categorias();
    return this.guardadas().flatMap((l) => {
      for (const categoria of cats) {
        const item = categoria.variedades.find((v) => v.id === l.variedadId);
        const precio = item?.precios.find((p) => p.presentacionId === l.presentacionId);
        if (item && precio) {
          return [{ ...l, item, categoria, precio, subtotal: (precio.precio ?? 0) * l.cantidad }];
        }
      }
      return [];
    });
  });

  readonly cantidad = computed(() => this.lineas().reduce((t, l) => t + l.cantidad, 0));
  readonly total = computed(() => this.lineas().reduce((t, l) => t + l.subtotal, 0));
  readonly hayAPreguntar = computed(() => this.lineas().some((l) => l.item.estado === 'agotado'));
  readonly haySinPrecio = computed(() => this.lineas().some((l) => l.precio.precio === null));

  constructor() {
    // effect = se ejecuta cada vez que cambia un signal que lee: guarda el carrito solo.
    effect(() => {
      try {
        localStorage.setItem(CLAVE, JSON.stringify(this.guardadas()));
      } catch {
        // sin almacenamiento (modo incógnito estricto): el carrito vive mientras la pestaña esté abierta
      }
    });
  }

  agregar(variedadId: number, presentacionId: number) {
    this.guardadas.update((ls) => {
      const existe = ls.find((l) => l.variedadId === variedadId && l.presentacionId === presentacionId);
      if (existe) {
        return ls.map((l) => (l === existe ? { ...l, cantidad: Math.min(l.cantidad + 1, 100) } : l));
      }
      return [...ls, { variedadId, presentacionId, cantidad: 1 }];
    });
  }

  cambiar(linea: LineaGuardada, delta: number) {
    this.guardadas.update((ls) =>
      ls
        .map((l) =>
          l.variedadId === linea.variedadId && l.presentacionId === linea.presentacionId
            ? { ...l, cantidad: Math.min(l.cantidad + delta, 100) }
            : l,
        )
        .filter((l) => l.cantidad > 0),
    );
  }

  vaciar() {
    this.guardadas.set([]);
  }

  // Texto del WhatsApp. Lo mismo que se ve en "Ver el mensaje".
  mensaje(d: DatosRetiro) {
    const renglones = this.lineas().map(
      (l) =>
        `• ${l.cantidad} ${l.precio.presentacion} — ${l.categoria.nombre}: ${l.item.nombre}` +
        (l.item.estado === 'agotado' ? ' (a preguntar)' : ''),
    );
    return (
      `Hola! Soy ${d.nombre.trim() || '[nombre]'}. Quiero encargar:\n` +
      renglones.join('\n') +
      `\n\nTotal estimado: ${pesos(this.total())}` +
      (this.haySinPrecio() ? ' (algunos precios a confirmar)' : '') +
      `\nRetiro en Pinto 1128 el ${d.dia || '[día]'}, ${d.horario || '[horario]'}.` +
      (d.telefono.trim() ? `\nMi teléfono: ${d.telefono.trim()}` : '')
    );
  }

  enlaceWhatsapp(texto: string) {
    return `https://wa.me/${environment.whatsapp}?text=${encodeURIComponent(texto)}`;
  }

  // Avisa al panel (Pedidos web). No bloquea al cliente: si falla, igual mandó su WhatsApp.
  // "web" es el campo trampa contra robots (una persona lo deja vacío).
  registrar(d: DatosRetiro, web: string) {
    return this.http.post<{ registrado: boolean }>(`${environment.apiUrl}/pedidos-web`, {
      cliente: d.nombre.trim(),
      telefono: d.telefono.trim() || null,
      dia: d.dia,
      horario: d.horario,
      web,
      detalles: this.guardadas().map(({ variedadId, presentacionId, cantidad }) => ({
        variedadId,
        presentacionId,
        cantidad,
      })),
    });
  }
}

function leer(): LineaGuardada[] {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
    return Array.isArray(datos) ? datos.filter((l) => l && l.variedadId && l.presentacionId && l.cantidad > 0) : [];
  } catch {
    return [];
  }
}

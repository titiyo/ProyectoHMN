import { Component, computed, inject, input, signal } from '@angular/core';
import { CategoriaCatalogo, ItemCatalogo, pesos } from '../services/catalogo.service';
import { CarritoService } from '../services/carrito.service';
import { AvisosService } from '../services/avisos.service';

const TEXTO_ESTADO = { disponible: 'Disponible', agotado: 'A preguntar', encargue: 'Por encargue' };

// Tarjeta de un producto: foto (o "Foto próximamente"), estado, precios, presentación y Agregar.
// Se usa en el carrusel de la portada y en la grilla de cada categoría.
@Component({
  selector: 'app-producto-card',
  template: `
    @let it = item();
    <article class="tarjeta">
      <div class="marco">
        @if (it.foto) {
          <img class="foto" [src]="it.foto" [alt]="'Relleno de ' + it.nombre" loading="lazy" />
        } @else {
          <div class="foto sin-foto">
            <svg width="38" height="38" viewBox="0 0 100 100" aria-hidden="true">
              <path d="M50 5C78 22 88 58 50 95 12 58 22 22 50 5Z" fill="none" stroke="currentColor" stroke-width="5" />
              <path d="M50 14V86" stroke="currentColor" stroke-width="5" />
            </svg>
            <span>FOTO PRÓXIMAMENTE</span>
          </div>
        }
        <span class="estado {{ it.estado }} etiqueta">{{ textoEstado[it.estado] }}</span>
      </div>
      <div class="cuerpo">
        <h3>{{ it.nombre }}</h3>
        <p class="precios num">{{ precios() }}</p>
        <div class="opciones" role="group" [attr.aria-label]="'Presentación de ' + it.nombre">
          @for (p of it.precios; track p.presentacionId; let i = $index) {
            <button type="button" class="chip" [class.activo]="i === elegida()" [attr.aria-pressed]="i === elegida()"
                    (click)="elegida.set(i)">{{ p.presentacion }}</button>
          }
        </div>
        <button type="button" class="btn btn-terra btn-pill w-100" (click)="agregar()">
          {{ it.estado === 'agotado' ? 'Agregar (a preguntar)' : 'Agregar' }}
        </button>
      </div>
    </article>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .tarjeta {
      background: var(--papel); border-radius: 18px; overflow: hidden; height: 100%;
      display: flex; flex-direction: column; box-shadow: var(--sombra);
      transition: transform .18s ease, box-shadow .18s ease;
    }
    .tarjeta:hover { transform: translateY(-3px); box-shadow: var(--sombra-alta); }
    .marco { position: relative; }
    .foto { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
    .sin-foto {
      background: var(--salvia-claro); color: var(--verde-oscuro);
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
      font-size: .72rem; font-weight: 800; letter-spacing: .14em;
    }
    .etiqueta { position: absolute; top: 12px; left: 12px; }
    .cuerpo { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
    h3 { margin: 0; font-size: 1.05rem; line-height: 1.25; color: var(--tinta); font-weight: 800; }
    .precios { margin: 0; color: var(--texto-suave); font-size: .88rem; font-weight: 600; }
    .opciones { margin-top: auto; display: flex; gap: 6px; flex-wrap: wrap; }
  `,
})
export class ProductoCard {
  private carrito = inject(CarritoService);
  private avisos = inject(AvisosService);

  readonly item = input.required<ItemCatalogo>();
  readonly categoria = input.required<CategoriaCatalogo>();

  protected textoEstado = TEXTO_ESTADO;
  protected elegida = signal(0); // índice de la presentación elegida

  // "unidad $ 900 · docena $ 9.800" (o "Consultar precio" si no hay ninguno cargado).
  protected precios = computed(() => {
    const conPrecio = this.item().precios.filter((p) => p.precio !== null);
    if (conPrecio.length === 0) return 'Consultar precio';
    return conPrecio.map((p) => `${p.presentacion} ${pesos(p.precio!)}`).join(' · ');
  });

  agregar() {
    const p = this.item().precios[this.elegida()];
    this.carrito.agregar(this.item().id, p.presentacionId);
    this.avisos.exito(`Agregaste ${this.item().nombre} (${p.presentacion}).`);
  }
}

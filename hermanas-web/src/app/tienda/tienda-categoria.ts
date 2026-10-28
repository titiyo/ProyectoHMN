import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CatalogoService } from '../services/catalogo.service';
import { ProductoCard } from './producto-card';

// Página de una categoría: /milanesas-de-soja-rellenas, /tartas-integrales...
// El "slug" llega de la dirección (withComponentInputBinding lo pasa como input).
@Component({
  selector: 'app-tienda-categoria',
  imports: [RouterLink, ProductoCard],
  template: `
    @if (categoria(); as c) {
      <main class="interior">
        <a routerLink="/" class="volver">← Todo el menú</a>
        <div class="titulo">
          <div>
            <h1 class="cursiva">{{ c.nombre }}</h1>
            <p>{{ c.nota ? c.nota + ' · ' : '' }}se vende por {{ presentaciones() }}</p>
          </div>
          <div role="group" aria-label="Filtrar" class="d-flex gap-2">
            <button type="button" class="chip" [class.activo]="!soloDisponibles()" [attr.aria-pressed]="!soloDisponibles()"
                    (click)="soloDisponibles.set(false)">Todas ({{ c.variedades.length }})</button>
            <button type="button" class="chip" [class.activo]="soloDisponibles()" [attr.aria-pressed]="soloDisponibles()"
                    (click)="soloDisponibles.set(true)">Disponibles hoy</button>
          </div>
        </div>
        <div class="grilla">
          @for (it of items(); track it.id) {
            <app-producto-card [item]="it" [categoria]="c" />
          } @empty {
            <p class="text-muted">Hoy no hay variedades disponibles de stock: igual podés encargarlas.</p>
          }
        </div>
      </main>
    } @else if (catalogo.cargando()) {
      <p class="text-center text-muted py-5">Cargando…</p>
    }
  `,
  styles: `
    .interior { max-width: 1240px; margin: 0 auto; padding: 24px 24px 40px; width: 100%; }
    .volver { font-weight: 700; text-decoration: none; display: inline-block; padding: 8px 0; }
    .titulo {
      display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin: 4px 0 22px;
      h1 { margin: 0; font-size: clamp(3rem, 8vw, 4.6rem); line-height: 1; }
      p { margin: 6px 0 0; font-size: 1.05rem; color: #4a463f; font-weight: 600; }
    }
    .grilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 22px; }
  `,
})
export class TiendaCategoria {
  protected catalogo = inject(CatalogoService);
  private router = inject(Router);

  readonly slug = input<string>();
  protected soloDisponibles = signal(false);

  protected categoria = computed(() => this.catalogo.categorias().find((c) => c.slug === this.slug()));
  protected presentaciones = computed(
    () => this.categoria()?.variedades[0]?.precios.map((p) => p.presentacion).join(', ') ?? '',
  );
  protected items = computed(() => {
    const c = this.categoria();
    if (!c) return [];
    const ordenados = this.catalogo.ordenar(c.variedades);
    return this.soloDisponibles() ? ordenados.filter((v) => v.estado === 'disponible') : ordenados;
  });

  constructor() {
    // Una dirección que no es ninguna categoría (cuando el catálogo ya cargó) → a la portada.
    effect(() => {
      if (this.catalogo.categorias().length > 0 && !this.categoria()) this.router.navigateByUrl('/');
    });
  }
}

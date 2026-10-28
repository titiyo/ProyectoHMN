import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CatalogoService } from '../services/catalogo.service';
import { CarritoService } from '../services/carrito.service';
import { CarritoPanel } from './carrito-panel';

// Marco de la tienda pública: encabezado con categorías y carrito, la página actual y el pie.
@Component({
  selector: 'app-tienda-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CarritoPanel],
  template: `
    <header class="barra">
      <div class="interior">
        <a routerLink="/" class="logo" aria-label="Hermanas Emprendedoras, inicio">
          <span class="cursiva">Hermanas</span>
          <span class="mayus">EMPRENDEDORAS</span>
        </a>
        <nav class="categorias" aria-label="Categorías">
          @for (c of catalogo.categorias(); track c.id) {
            <a [routerLink]="'/' + c.slug" routerLinkActive="activa">{{ corto(c.nombre) }}</a>
          }
        </nav>
        <button type="button" class="btn btn-primary btn-pill carrito" (click)="carrito.abierto.set(true)"
                [attr.aria-label]="'Abrir el carrito, ' + carrito.cantidad() + ' productos'">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6 5 3H2"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>
          <span class="d-none d-sm-inline">Carrito</span>
          <span class="contador num">{{ carrito.cantidad() }}</span>
        </button>
      </div>
    </header>

    <router-outlet />

    <footer class="pie">
      <svg class="hoja" width="220" height="220" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 5C78 22 88 58 50 95 12 58 22 22 50 5Z" fill="currentColor"/></svg>
      <div class="interior grilla">
        <div class="logo claro">
          <span class="cursiva">Hermanas</span>
          <span class="mayus">EMPRENDEDORAS</span>
        </div>
        <div><strong>Retiro en el local</strong>Pinto 1128, Tandil</div>
        <div><strong>Horarios</strong>Lunes a viernes 9:30 a 13:30 y 17:30 a 20:30<br />Sábados 10:00 a 13:00</div>
        <div><strong>Seguinos</strong><a href="https://www.instagram.com/hermanasemprendedoras" target="_blank" rel="noopener">&#64;hermanasemprendedoras</a></div>
      </div>
      <!-- Entrada al panel para la vendedora: discreta a propósito. Si ya tiene sesión,
           la pantalla de login la manda sola a /panel. -->
      <div class="text-center pb-3"><a routerLink="/login" class="acceso">Acceso</a></div>
    </footer>

    <app-carrito-panel />
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .interior { max-width: 1240px; margin: 0 auto; padding: 10px 24px; }
    .barra {
      position: sticky; top: 0; z-index: 1020;
      background: rgba(244, 239, 230, 0.94); backdrop-filter: blur(8px); border-bottom: 1px solid var(--borde);
      .interior { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
    }
    .logo .cursiva { font-size: 2.3rem; }
    .categorias {
      display: flex; gap: 6px 18px; flex: 1; justify-content: center; flex-wrap: wrap;
      a { color: #3d3a35; font-weight: 700; text-decoration: none; padding: 10px 2px; border-bottom: 2px solid transparent; white-space: nowrap; }
      a:hover, a.activa { color: var(--verde-oscuro); border-bottom-color: var(--verde-oscuro); }
    }
    .carrito { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; }
    .contador {
      background: var(--crema); color: var(--verde-oscuro); border-radius: 999px; min-width: 24px; height: 24px;
      display: inline-flex; align-items: center; justify-content: center; font-size: .8rem; padding: 0 7px;
    }
    @media (max-width: 760px) { .categorias { order: 3; flex-basis: 100%; justify-content: flex-start; overflow-x: auto; flex-wrap: nowrap; } }

    .pie { margin-top: auto; background: var(--verde-noche); color: #eef1e8; position: relative; overflow: hidden; padding-top: 30px; }
    .hoja { position: absolute; right: -50px; bottom: -70px; transform: rotate(-30deg); color: var(--verde-salvia); opacity: .25; }
    .grilla { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; padding-bottom: 20px; position: relative; }
    .grilla strong { display: block; margin-bottom: 4px; }
    .grilla a { color: #fff; }
    .logo.claro { color: #fff; .cursiva { font-size: 2.6rem; } }
    .acceso { font-size: .7rem; color: rgba(255, 255, 255, .35); text-decoration: none; }
    .acceso:hover, .acceso:focus-visible { color: rgba(255, 255, 255, .7); }
  `,
})
export class TiendaLayout implements OnInit {
  protected catalogo = inject(CatalogoService);
  protected carrito = inject(CarritoService);

  ngOnInit() {
    this.catalogo.cargar();
  }

  // Para el menú de arriba: "Milanesas de soja rellenas" → "Milanesas de soja".
  corto(nombre: string) {
    return nombre.replace(/ (rellenas|integrales|vegetarianos|veganas)$/i, '');
  }
}

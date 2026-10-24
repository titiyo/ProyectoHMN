import { Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StockLista } from '../../components/stock-lista/stock-lista';
import { VentaForm } from '../../components/venta-form/venta-form';
import { PorHacerResumen } from '../../components/por-hacer-resumen/por-hacer-resumen';
import { VentasService } from '../../services/ventas.service';

// Tablero: los mismos componentes que las páginas propias, en versión compacta.
@Component({
  selector: 'app-inicio',
  imports: [StockLista, VentaForm, PorHacerResumen, RouterLink, CurrencyPipe, DatePipe],
  template: `
    <div class="row g-3">
      <div class="col-lg-5">
        <section class="panel">
          <div class="d-flex justify-content-between align-items-baseline">
            <h2 class="h5">Stock</h2>
            <a routerLink="/panel/stock" class="small">ver todo</a>
          </div>
          <div class="scroll"><app-stock-lista [compacto]="true" /></div>
        </section>
      </div>

      <div class="col-lg-7">
        <div class="row g-3">
          <div class="col-12">
            <section class="panel">
              <h2 class="h5">Venta rápida</h2>
              <app-venta-form [compacto]="true" />
            </section>
          </div>

          <div class="col-md-6">
            <section class="panel">
              <div class="d-flex justify-content-between align-items-baseline">
                <h2 class="h5">Por hacer</h2>
                <a routerLink="/panel/por-hacer" class="small">detalle</a>
              </div>
              <app-por-hacer-resumen [compacto]="true" />
            </section>
          </div>

          <div class="col-md-6">
            <section class="panel">
              <div class="d-flex justify-content-between align-items-baseline">
                <h2 class="h5">Últimas ventas de hoy</h2>
                <a routerLink="/panel/ventas" class="small">historial</a>
              </div>
              <table class="table table-sm mb-0">
                <tbody>
                  @for (v of ventas.ultimas(); track v.id) {
                    <tr>
                      <td class="num">{{ v.fecha | date:'HH:mm' }}</td>
                      <td class="text-truncate">{{ v.cliente ?? '' }}{{ v.encargueId ? ' (encargue)' : '' }}</td>
                      <td class="text-end num">{{ v.total | currency:'ARS':'symbol-narrow':'1.0-0' }}</td>
                    </tr>
                  } @empty {
                    <tr><td class="text-muted">Todavía no hay ventas hoy.</td></tr>
                  }
                </tbody>
              </table>
            </section>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    /* En compu el stock se desplaza por dentro para que el tablero entre en pantalla. */
    @media (min-width: 992px) { .scroll { max-height: calc(100vh - 190px); overflow-y: auto; padding-right: .25rem; } }
  `,
})
export class Inicio {
  protected ventas = inject(VentasService);
}

import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VentasService } from '../../services/ventas.service';
import { EncarguesService } from '../../services/encargues.service';
import { StockService } from '../../services/stock.service';
import { PedidosWebService } from '../../services/pedidos-web.service';
import { esPorEncargue } from '../../models';

const STOCK_BAJO = 6;

// Fila de números grandes arriba del tablero. Todo sale de datos que el panel ya cargó
// (signals de los servicios), así que se actualiza solo cuando algo cambia.
@Component({
  selector: 'app-resumen-hoy',
  imports: [CurrencyPipe, RouterLink],
  template: `
    <section class="fila" aria-label="Resumen de hoy">
      <a class="kpi" routerLink="/panel/ventas">
        <span class="etiqueta">Vendido hoy</span>
        <strong class="num">{{ vendido() | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</strong>
        <span class="sub">{{ cantidadVentas() }} {{ cantidadVentas() === 1 ? 'venta' : 'ventas' }}</span>
      </a>
      <a class="kpi" routerLink="/panel/encargues">
        <span class="etiqueta">Encargues pendientes</span>
        <strong class="num">{{ pendientes() }}</strong>
        <span class="sub">{{ porHacer() }} unidades por hacer</span>
      </a>
      <a class="kpi" routerLink="/panel/pedidos-web" [class.alerta]="pedidosNuevos() > 0">
        <span class="etiqueta">Pedidos web nuevos</span>
        <strong class="num">{{ pedidosNuevos() }}</strong>
        <span class="sub">{{ pedidosNuevos() > 0 ? 'para revisar' : 'al día' }}</span>
      </a>
      <a class="kpi" routerLink="/panel/stock">
        <span class="etiqueta">Stock bajo</span>
        <strong class="num">{{ stockBajo() }}</strong>
        <span class="sub">variedades con menos de {{ limite }}</span>
      </a>
    </section>
  `,
  styles: `
    .fila { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 18px; }
    .kpi {
      background: var(--papel); border-radius: 18px; padding: 16px 20px; box-shadow: var(--sombra);
      text-decoration: none; color: inherit; display: flex; flex-direction: column;
      transition: transform .15s ease, box-shadow .15s ease;
      &:hover { transform: translateY(-2px); box-shadow: var(--sombra-alta); }
    }
    .etiqueta { font-size: .78rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #5f7354; }
    strong { font-size: 2.1rem; color: var(--verde-noche); line-height: 1.2; }
    .sub { font-size: .82rem; color: var(--texto-suave); }
    .alerta { background: #f6e3c7; .etiqueta, strong { color: #7a3f0e; } }
  `,
})
export class ResumenHoy {
  private ventas = inject(VentasService);
  private encargues = inject(EncarguesService);
  private stock = inject(StockService);
  private pedidosWeb = inject(PedidosWebService);

  protected limite = STOCK_BAJO;
  protected vendido = computed(() => this.ventas.deHoy().reduce((t, v) => t + v.total, 0));
  protected cantidadVentas = computed(() => this.ventas.deHoy().length);
  // Encargues distintos que todavía tienen algo por hacer.
  protected pendientes = computed(
    () => new Set(this.encargues.porHacer().variedades.flatMap((v) => v.encargues.map((e) => e.encargueId))).size,
  );
  protected porHacer = computed(() => this.encargues.porHacer().total);
  protected pedidosNuevos = this.pedidosWeb.nuevos;
  protected stockBajo = computed(
    () => this.stock.variedades().filter((v) => v.visible && !esPorEncargue(v) && v.stock < STOCK_BAJO).length,
  );
}

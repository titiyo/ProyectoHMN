import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { StockService } from '../services/stock.service';
import { VentasService } from '../services/ventas.service';
import { EncarguesService } from '../services/encargues.service';
import { AuthService } from '../services/auth.service';
import { PedidosWebService } from '../services/pedidos-web.service';

// Marco del panel privado: menú lateral + la página actual adentro.
@Component({
  selector: 'app-panel',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './panel.html',
  styleUrl: './panel.scss',
})
export class Panel implements OnInit, OnDestroy {
  private stock = inject(StockService);
  private ventas = inject(VentasService);
  private encargues = inject(EncarguesService);
  protected pedidosWeb = inject(PedidosWebService);
  protected auth = inject(AuthService);

  // Menú en el celular. Bootstrap lo haría con su JS; acá alcanza con un signal.
  protected menuAbierto = signal(false);
  private reloj?: ReturnType<typeof setInterval>;

  // Íconos: trazos SVG simples (cada uno, una o más líneas "d").
  protected links = [
    { ruta: '/panel', texto: 'Inicio', exacto: true, icono: ['M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'] },
    { ruta: '/panel/stock', texto: 'Stock', exacto: false, icono: ['M4 7h16v13H4z', 'M8 7V4h8v3'] },
    { ruta: '/panel/nueva-venta', texto: 'Nueva venta', exacto: false, icono: ['M12 5v14M5 12h14'] },
    { ruta: '/panel/ventas', texto: 'Ventas', exacto: false, icono: ['M4 19h16M7 16V9M12 16V5M17 16v-4'] },
    { ruta: '/panel/encargues', texto: 'Encargues', exacto: false, icono: ['M8 4h8l1 3H7z', 'M5 7h14v13H5z', 'M9 12h6M9 16h4'] },
    { ruta: '/panel/pedidos-web', texto: 'Pedidos web', exacto: false, icono: ['M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12Z'] },
    { ruta: '/panel/por-hacer', texto: 'Por hacer', exacto: false, icono: ['M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01'] },
    { ruta: '/panel/configuracion', texto: 'Configuración', exacto: false, icono: ['M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0', 'M16 4v4M10 10v4M18 16v4'] },
  ];

  // Carga los datos compartidos al entrar al panel.
  ngOnInit() {
    this.stock.cargar();
    this.ventas.cargarUltimas();
    this.encargues.cargarPorHacer();
    this.pedidosWeb.cargarNuevos();
    // Cada 2 minutos se fija si entraron pedidos web nuevos (para el número del menú).
    this.reloj = setInterval(() => this.pedidosWeb.cargarNuevos(), 120_000);
  }

  ngOnDestroy() {
    clearInterval(this.reloj);
  }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { StockService } from '../services/stock.service';
import { VentasService } from '../services/ventas.service';
import { EncarguesService } from '../services/encargues.service';

// Marco del panel privado: barra de navegación + la página actual adentro.
@Component({
  selector: 'app-panel',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './panel.html',
  styleUrl: './panel.scss',
})
export class Panel implements OnInit {
  private stock = inject(StockService);
  private ventas = inject(VentasService);
  private encargues = inject(EncarguesService);

  // Menú hamburguesa en celular. Bootstrap lo haría con su JS; acá alcanza con un signal.
  protected menuAbierto = signal(false);

  protected links = [
    { ruta: '/panel', texto: 'Inicio', exacto: true },
    { ruta: '/panel/stock', texto: 'Stock', exacto: false },
    { ruta: '/panel/nueva-venta', texto: 'Nueva venta', exacto: false },
    { ruta: '/panel/ventas', texto: 'Ventas', exacto: false },
    { ruta: '/panel/encargues', texto: 'Encargues', exacto: false },
    { ruta: '/panel/por-hacer', texto: 'Por hacer', exacto: false },
    { ruta: '/panel/configuracion', texto: 'Configuración', exacto: false },
  ];

  // Carga los datos compartidos una sola vez al entrar al panel.
  ngOnInit() {
    this.stock.cargar();
    this.ventas.cargarUltimas();
    this.encargues.cargarPorHacer();
  }
}

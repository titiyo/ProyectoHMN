import { Component } from '@angular/core';
import { StockLista } from '../../components/stock-lista/stock-lista';

@Component({
  selector: 'app-stock-page',
  imports: [StockLista],
  template: `
    <h1 class="h3">Stock</h1>
    <p class="text-muted">Cantidades en unidades. Las variedades en gris e itálica están ocultas del catálogo.</p>
    <section class="panel"><app-stock-lista /></section>
  `,
})
export class StockPage {}

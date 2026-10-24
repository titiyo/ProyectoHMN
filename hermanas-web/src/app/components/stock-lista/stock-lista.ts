import { Component, inject, input, signal } from '@angular/core';
import { StockService } from '../../services/stock.service';
import { AvisosService } from '../../services/avisos.service';
import { enDocenas, Variedad } from '../../models';

// Lista de variedades agrupadas por categoría con botones para ajustar el stock.
// Se usa en el tablero (compacto) y en la página Stock (completo, con ±12).
@Component({
  selector: 'app-stock-lista',
  templateUrl: './stock-lista.html',
  styleUrl: './stock-lista.scss',
})
export class StockLista {
  private stock = inject(StockService);
  private avisos = inject(AvisosService);

  // input() = dato que le pasa el componente padre: <app-stock-lista [compacto]="true" />
  readonly compacto = input(false);

  protected grupos = this.stock.porCategoria;
  protected enDocenas = enDocenas;

  // Ids con un pedido en curso, para deshabilitar sus botones y evitar doble clic.
  protected ocupados = signal<Set<number>>(new Set());

  ajustar(v: Variedad, delta: number) {
    this.marcar(v.id, true);
    this.stock.ajustarStock(v.id, delta).subscribe({
      next: () => this.marcar(v.id, false),
      error: (err) => {
        this.marcar(v.id, false);
        this.avisos.error(err);
      },
    });
  }

  private marcar(id: number, ocupado: boolean) {
    this.ocupados.update((s) => {
      const nuevo = new Set(s);
      if (ocupado) nuevo.add(id);
      else nuevo.delete(id);
      return nuevo;
    });
  }
}

import { Component, inject, input } from '@angular/core';
import { EncarguesService } from '../../services/encargues.service';
import { StockService } from '../../services/stock.service';
import { enPresentaciones } from '../../models';

// Qué falta elaborar para los encargues pendientes, agrupado por variedad.
// Ya descuenta lo reservado del stock (cantidad - preparada).
// Compacto (tablero): solo variedad y subtotal. Completo: además cada encargue con su cliente.
@Component({
  selector: 'app-por-hacer-resumen',
  template: `
    @let datos = encargues.porHacer();
    @if (datos.variedades.length === 0) {
      <p class="text-muted mb-0">No hay nada por hacer.</p>
    } @else {
      <table class="table table-sm align-middle mb-0">
        <tbody>
          @for (v of datos.variedades; track v.variedadId) {
            <tr class="variedad">
              <td>{{ v.nombre }}</td>
              <td class="text-end num">
                <strong>{{ v.subtotal }}</strong>
                <span class="text-muted small"> ({{ equivalente(v.variedadId, v.subtotal) }})</span>
              </td>
            </tr>
            @if (!compacto()) {
              @for (e of v.encargues; track e.encargueId) {
                <tr class="small text-muted">
                  <td class="ps-4">
                    #{{ e.encargueId }} · {{ e.cliente }} · {{ e.telefono }}
                    @if (e.retiro) { · <strong>retira {{ e.retiro }}</strong> }
                    @if (e.preparada > 0) { · <em>{{ e.preparada }} de {{ e.cantidad }} ya reservadas</em> }
                  </td>
                  <td class="text-end num">{{ e.faltan }}</td>
                </tr>
              }
            }
          }
        </tbody>
        <tfoot>
          <tr>
            <th>Total</th>
            <th class="text-end num">{{ datos.total }} u</th>
          </tr>
        </tfoot>
      </table>
    }
  `,
  styles: `
    .variedad td { background: var(--salvia-claro); }
  `,
})
export class PorHacerResumen {
  protected encargues = inject(EncarguesService);
  private stock = inject(StockService);
  readonly compacto = input(false);

  // "26" → "2 docena + 2 u", con las presentaciones de la categoría de esa variedad.
  equivalente(variedadId: number, unidades: number) {
    const v = this.stock.variedades().find((x) => x.id === variedadId);
    return enPresentaciones(unidades, this.stock.presentacionesDe(v?.categoriaId));
  }
}

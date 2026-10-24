import { Component, inject, input } from '@angular/core';
import { EncarguesService } from '../../services/encargues.service';
import { enDocenas } from '../../models';

// Qué hay que elaborar para los encargues pendientes, agrupado por variedad.
// Compacto (tablero): solo variedad y subtotal. Completo: además cada encargue con su cliente.
@Component({
  selector: 'app-por-hacer-resumen',
  template: `
    @let datos = encargues.porHacer();
    @if (datos.variedades.length === 0) {
      <p class="text-muted mb-0">No hay encargues pendientes.</p>
    } @else {
      <table class="table table-sm align-middle mb-0">
        <tbody>
          @for (v of datos.variedades; track v.variedadId) {
            <tr class="variedad">
              <td>{{ v.nombre }}</td>
              <td class="text-end num"><strong>{{ v.subtotal }}</strong> <span class="text-muted small">({{ enDocenas(v.subtotal) }})</span></td>
            </tr>
            @if (!compacto()) {
              @for (e of v.encargues; track e.encargueId) {
                <tr class="small text-muted">
                  <td class="ps-4">#{{ e.encargueId }} · {{ e.cliente }} · {{ e.telefono }}</td>
                  <td class="text-end num">{{ e.cantidad }}{{ e.modo === 'docena' ? ' (' + enDocenas(e.cantidad) + ')' : '' }}</td>
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
  readonly compacto = input(false);
  protected enDocenas = enDocenas;
}

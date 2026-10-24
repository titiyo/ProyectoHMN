import { Component } from '@angular/core';
import { PorHacerResumen } from '../../components/por-hacer-resumen/por-hacer-resumen';

@Component({
  selector: 'app-por-hacer-page',
  imports: [PorHacerResumen],
  template: `
    <h1 class="h3">Por hacer</h1>
    <p class="text-muted">Lo que hay que elaborar para los encargues pendientes, en unidades.</p>
    <section class="panel" style="max-width: 760px"><app-por-hacer-resumen /></section>
  `,
})
export class PorHacerPage {}

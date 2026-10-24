import { Component } from '@angular/core';
import { VentaForm } from '../../components/venta-form/venta-form';

@Component({
  selector: 'app-nueva-venta',
  imports: [VentaForm],
  template: `
    <h1 class="h3">Nueva venta</h1>
    <section class="panel" style="max-width: 860px"><app-venta-form /></section>
  `,
})
export class NuevaVenta {}

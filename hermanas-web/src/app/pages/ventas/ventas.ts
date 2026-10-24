import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { aFormatoApi, VentasService } from '../../services/ventas.service';
import { AvisosService } from '../../services/avisos.service';
import { Venta } from '../../models';

// Historial de ventas con filtro por fecha.
@Component({
  selector: 'app-ventas',
  imports: [FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './ventas.html',
})
export class Ventas implements OnInit {
  private ventasService = inject(VentasService);
  private avisos = inject(AvisosService);

  // <input type="date"> trabaja con yyyy-mm-dd. Por defecto: hoy.
  protected desde = hoyInput();
  protected hasta = hoyInput();

  protected ventas = signal<Venta[]>([]);
  protected cargando = signal(false);
  protected abierta = signal<number | null>(null);
  protected totalPeriodo = computed(() => this.ventas().reduce((s, v) => s + v.total, 0));

  ngOnInit() {
    this.buscar();
  }

  buscar() {
    this.cargando.set(true);
    this.ventasService
      .listar(
        this.desde ? aFormatoApi(this.desde) : undefined,
        this.hasta ? aFormatoApi(this.hasta) : undefined,
      )
      .subscribe({
        next: (v) => {
          this.ventas.set(v);
          this.cargando.set(false);
        },
        error: (err) => {
          this.cargando.set(false);
          this.avisos.error(err);
        },
      });
  }

  verTodo() {
    this.desde = '';
    this.hasta = '';
    this.buscar();
  }

  alternar(id: number) {
    this.abierta.set(this.abierta() === id ? null : id);
  }

  anular(v: Venta) {
    const aviso = v.encargueId
      ? `¿Anular la venta #${v.id}? El encargue #${v.encargueId} vuelve a "listo".`
      : `¿Anular la venta #${v.id}? Las unidades vuelven al stock.`;
    if (!confirm(aviso)) return;
    this.ventasService.anular(v.id).subscribe({
      next: () => {
        this.avisos.exito(`Venta #${v.id} anulada.`);
        this.buscar();
      },
      error: (err) => this.avisos.error(err),
    });
  }
}

function hoyInput() {
  const d = new Date();
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

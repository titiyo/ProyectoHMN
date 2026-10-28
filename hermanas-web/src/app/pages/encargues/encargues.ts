import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EncarguesService } from '../../services/encargues.service';
import { StockService } from '../../services/stock.service';
import { VentasService } from '../../services/ventas.service';
import { AvisosService } from '../../services/avisos.service';
import { Encargue, EstadoEncargue } from '../../models';

interface RenglonAlta {
  variedadId: number | null;
  presentacionId: number | null;
  cantidad: number | null;
}

// Siguiente y anterior de cada estado (igual que las transiciones del backend).
const SIGUIENTE: Partial<Record<EstadoEncargue, EstadoEncargue>> = {
  pendiente: 'listo',
  listo: 'entregado',
};
const ANTERIOR: Partial<Record<EstadoEncargue, EstadoEncargue>> = {
  listo: 'pendiente',
};

@Component({
  selector: 'app-encargues',
  imports: [FormsModule, DatePipe],
  templateUrl: './encargues.html',
  styleUrl: './encargues.scss',
})
export class Encargues implements OnInit {
  private encarguesService = inject(EncarguesService);
  private ventas = inject(VentasService);
  private avisos = inject(AvisosService);
  private stock = inject(StockService);
  protected grupos = this.stock.porCategoria;

  protected filtros: { valor: EstadoEncargue | undefined; texto: string }[] = [
    { valor: 'pendiente', texto: 'Pendientes' },
    { valor: 'listo', texto: 'Listos' },
    { valor: 'entregado', texto: 'Entregados' },
    { valor: undefined, texto: 'Todos' },
  ];
  protected filtro = signal<EstadoEncargue | undefined>('pendiente');
  protected encargues = signal<Encargue[]>([]);
  protected siguiente = SIGUIENTE;
  protected anterior = ANTERIOR;

  // Alta
  protected mostrarAlta = signal(false);
  protected nuevo = this.encargueVacio();

  ngOnInit() {
    this.cargar();
  }

  elegirFiltro(valor: EstadoEncargue | undefined) {
    this.filtro.set(valor);
    this.cargar();
  }

  cargar() {
    this.encarguesService.listar(this.filtro()).subscribe({
      next: (e) => this.encargues.set(e),
      error: (err) => this.avisos.error(err),
    });
  }

  mover(e: Encargue, estado: EstadoEncargue) {
    if (estado === 'entregado' && !confirm(`¿Entregar el encargue de ${e.cliente}? Se registra la venta con los precios de hoy.`)) {
      return;
    }
    this.encarguesService.cambiarEstado(e.id, estado).subscribe({
      next: ({ venta }) => {
        if (venta) {
          this.avisos.exito(`Encargue entregado. Venta #${venta.id} por $ ${venta.total.toLocaleString('es-AR')}.`);
          this.ventas.cargarUltimas();
        } else {
          this.avisos.exito(`Encargue #${e.id} pasó a "${estado}".`);
        }
        this.cargar();
      },
      error: (err) => this.avisos.error(err),
    });
  }

  cancelar(e: Encargue) {
    const vuelven = e.estado === 'listo' ? 'todo lo preparado' : 'lo reservado';
    if (!confirm(`¿Cancelar el encargue #${e.id} de ${e.cliente}? ${vuelven[0].toUpperCase() + vuelven.slice(1)} vuelve al stock.`)) return;
    this.encarguesService.cancelar(e.id).subscribe({
      next: (r) => {
        this.avisos.exito(r.message);
        this.stock.cargar();
        this.cargar();
      },
      error: (err) => this.avisos.error(err),
    });
  }

  // ---- Alta ----

  get altaValida() {
    const n = this.nuevo;
    return (
      n.cliente.trim() !== '' &&
      n.telefono.trim() !== '' &&
      n.detalles.every((d) => d.variedadId && d.presentacionId && d.cantidad && d.cantidad >= 1)
    );
  }

  crear() {
    if (!this.altaValida) return;
    const n = this.nuevo;
    this.encarguesService
      .crear({
        cliente: n.cliente.trim(),
        telefono: n.telefono.trim(),
        retiro: n.retiro.trim() || null,
        detalles: n.detalles.map((d) => ({
          variedadId: d.variedadId!,
          presentacionId: d.presentacionId!,
          cantidad: d.cantidad!,
        })),
      })
      .subscribe({
        next: (e) => {
          this.avisos.exito(`Encargue #${e.id} creado para ${e.cliente}.`);
          this.nuevo = this.encargueVacio();
          this.mostrarAlta.set(false);
          this.cargar();
        },
        error: (err) => this.avisos.error(err),
      });
  }

  presentacionesDe(variedadId: number | null) {
    const v = this.stock.variedades().find((x) => x.id === variedadId);
    return this.stock.presentacionesDe(v?.categoriaId);
  }

  // Al cambiar de variedad elijo la primera presentación de su categoría.
  cambiarVariedad(d: RenglonAlta, id: number | null) {
    d.variedadId = id;
    const opciones = this.presentacionesDe(id);
    if (!opciones.some((p) => p.id === d.presentacionId)) d.presentacionId = opciones[0]?.id ?? null;
  }

  agregarRenglon() {
    this.nuevo.detalles.push({ variedadId: null, presentacionId: null, cantidad: 1 });
  }

  private encargueVacio() {
    return {
      cliente: '',
      telefono: '',
      retiro: '',
      detalles: [{ variedadId: null, presentacionId: null, cantidad: 1 }] as RenglonAlta[],
    };
  }
}

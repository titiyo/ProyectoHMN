import { Component, inject, input, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockService } from '../../services/stock.service';
import { VentasService } from '../../services/ventas.service';
import { AvisosService } from '../../services/avisos.service';
import { Modo, precioEfectivo, UNIDADES_POR_MODO, Variedad } from '../../models';

interface Renglon {
  variedadId: number | null;
  modo: Modo;
  cantidad: number | null;
}

// Cómo queda un renglón con el stock actual: cuánto se vende ya y cuánto falta.
interface Analisis {
  variedad: Variedad;
  porUnidad: number;
  pedidas: number;   // unidades
  vendibles: number; // unidades que salen del stock
  faltan: number;    // unidades que irían a encargue
  precio: number | null;
  subtotal: number;  // solo de lo que se vende ya
}

// Formulario de venta. En el tablero se usa compacto (un renglón, sin cliente salvo
// que haga falta encargar); en "Nueva venta" completo, con varios renglones.
@Component({
  selector: 'app-venta-form',
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './venta-form.html',
  styleUrl: './venta-form.scss',
})
export class VentaForm {
  private stock = inject(StockService);
  private ventas = inject(VentasService);
  private avisos = inject(AvisosService);

  readonly compacto = input(false);

  protected grupos = this.stock.porCategoria;
  protected renglones: Renglon[] = [this.renglonVacio()];
  protected cliente = '';
  protected telefono = '';
  protected encargarFaltante = false;
  protected enviando = signal(false);

  // Se recalcula en cada detección de cambios (al tipear o al cambiar el stock).
  // Repite la misma regla que el backend: por docena solo se venden docenas completas.
  analizar(r: Renglon): Analisis | null {
    const variedad = this.stock.variedades().find((v) => v.id === r.variedadId);
    if (!variedad || !r.cantidad || r.cantidad < 1) return null;
    const porUnidad = UNIDADES_POR_MODO[r.modo];
    const pedidas = r.cantidad * porUnidad;
    const vendibles = variedad.categoria.porEncargue
      ? 0
      : Math.min(pedidas, Math.floor(variedad.stock / porUnidad) * porUnidad);
    const precio = precioEfectivo(variedad, r.modo);
    return {
      variedad,
      porUnidad,
      pedidas,
      vendibles,
      faltan: pedidas - vendibles,
      precio,
      subtotal: (precio ?? 0) * (vendibles / porUnidad),
    };
  }

  get analisis() {
    return this.renglones.map((r) => this.analizar(r));
  }

  get total() {
    return this.analisis.reduce((suma, a) => suma + (a?.subtotal ?? 0), 0);
  }

  get hayFaltante() {
    return this.analisis.some((a) => a && a.faltan > 0);
  }

  // Lo que se va a vender sin precio cargado: la API lo rechazaría con 400.
  get sinPrecio() {
    return this.analisis.filter((a) => a && a.vendibles > 0 && a.precio === null);
  }

  get puedeEnviar() {
    const completos = this.renglones.every((r) => r.variedadId && r.cantidad && r.cantidad >= 1);
    if (!completos || this.enviando() || this.sinPrecio.length > 0) return false;
    if (this.hayFaltante) {
      return this.encargarFaltante && this.cliente.trim() !== '' && this.telefono.trim() !== '';
    }
    return true;
  }

  agregarRenglon() {
    this.renglones.push(this.renglonVacio());
  }

  quitarRenglon(i: number) {
    this.renglones.splice(i, 1);
  }

  registrar() {
    if (!this.puedeEnviar) return;
    this.enviando.set(true);
    const conEncargue = this.hayFaltante;

    this.ventas
      .registrar({
        cliente: this.cliente.trim() || undefined,
        // telefono y encargarFaltante solo van si hay algo para encargar.
        telefono: conEncargue ? this.telefono.trim() : undefined,
        encargarFaltante: conEncargue || undefined,
        detalles: this.renglones.map((r) => ({
          variedadId: r.variedadId!,
          modo: r.modo,
          cantidad: r.cantidad!,
        })),
      })
      .subscribe({
        next: ({ venta, encargue }) => {
          const partes = [];
          if (venta) partes.push(`Venta registrada por $ ${venta.total.toLocaleString('es-AR')}`);
          if (encargue) partes.push(`encargue #${encargue.id} creado para ${encargue.cliente}`);
          this.avisos.exito(partes.join(' y ') + '.');
          this.limpiar();
        },
        error: (err) => {
          this.enviando.set(false);
          this.avisos.error(err);
        },
      });
  }

  private limpiar() {
    this.renglones = [this.renglonVacio()];
    this.cliente = '';
    this.telefono = '';
    this.encargarFaltante = false;
    this.enviando.set(false);
  }

  private renglonVacio(): Renglon {
    return { variedadId: null, modo: 'unidad', cantidad: 1 };
  }
}

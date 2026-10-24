import { Component, inject, input, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { StockService } from '../../services/stock.service';
import { VentasService } from '../../services/ventas.service';
import { AvisosService } from '../../services/avisos.service';
import { esPorEncargue, precioEfectivo, Presentacion, Variedad } from '../../models';

interface Renglon {
  variedadId: number | null;
  presentacionId: number | null;
  cantidad: number | null;
}

// Cómo queda un renglón con el stock actual.
interface Analisis {
  variedad: Variedad;
  presentacion: Presentacion;
  pedidas: number; // en unidades de stock
  porEncargue: boolean;
  alcanza: boolean; // hay stock para venderlo ya
  reservable: number; // cuántas se podrían reservar del stock si no alcanza
  precio: number | null;
  subtotal: number;
}

type Opcion = 'reservar' | 'hacer';

// Formulario de venta. En el tablero se usa compacto (un renglón); en "Nueva venta"
// completo, con varios renglones.
// Si algo no alcanza (o es por encargue), TODO el pedido pasa a encargue y hay que
// elegir: reservar lo que hay en stock, o no tocarlo y mandar a hacer todo.
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
  protected opcion: Opcion | null = null;
  protected enviando = signal(false);

  presentacionesDe(r: Renglon): Presentacion[] {
    const v = this.stock.variedades().find((x) => x.id === r.variedadId);
    return this.stock.presentacionesDe(v?.categoriaId);
  }

  // Al cambiar de variedad, la presentación anterior puede no existir en la nueva
  // categoría (ej. de milanesa a tarta): elijo la primera de la nueva.
  cambiarVariedad(r: Renglon, id: number | null) {
    r.variedadId = id;
    const presentaciones = this.presentacionesDe(r);
    if (!presentaciones.some((p) => p.id === r.presentacionId)) {
      r.presentacionId = presentaciones[0]?.id ?? null;
    }
  }

  // Se recalcula en cada detección de cambios. Repite la regla del backend:
  // se va restando el stock por si la misma variedad está en dos renglones.
  get analisis(): (Analisis | null)[] {
    const restante = new Map<number, number>(); // para ver si alcanza
    const disponible = new Map<number, number>(); // para calcular lo reservable
    return this.renglones.map((r) => {
      const variedad = this.stock.variedades().find((v) => v.id === r.variedadId);
      const presentacion = this.presentacionesDe(r).find((p) => p.id === r.presentacionId);
      if (!variedad || !presentacion || !r.cantidad || r.cantidad < 1) return null;

      const pedidas = r.cantidad * presentacion.unidades;
      const porEncargue = esPorEncargue(variedad);
      const hay = restante.get(variedad.id) ?? variedad.stock;
      const alcanza = !porEncargue && hay >= pedidas;
      if (alcanza) restante.set(variedad.id, hay - pedidas);

      const disp = disponible.get(variedad.id) ?? variedad.stock;
      // Se reserva stock aunque sea por encargue (igual que el backend).
      const reservable = Math.min(pedidas, disp);
      disponible.set(variedad.id, disp - reservable);

      const precio = precioEfectivo(variedad, presentacion);
      return {
        variedad, presentacion, pedidas, porEncargue, alcanza, reservable, precio,
        subtotal: (precio ?? 0) * r.cantidad,
      };
    });
  }

  get total() {
    return this.analisis.reduce((suma, a) => suma + (a?.subtotal ?? 0), 0);
  }

  // ¿Algún renglón no se puede vender ya? Entonces todo va a encargue.
  get hayFaltante() {
    return this.analisis.some((a) => a && !a.alcanza);
  }

  // Números para el texto de las opciones, sumando todo el pedido.
  get numeros() {
    const lista = this.analisis.filter((a): a is Analisis => a !== null);
    const pedidas = lista.reduce((s, a) => s + a.pedidas, 0);
    const reservables = lista.reduce((s, a) => s + a.reservable, 0);
    return { pedidas, reservables, faltan: pedidas - reservables };
  }

  // Solo bloquea si es venta inmediata: en un encargue el precio se fija al entregar.
  get sinPrecio() {
    return this.analisis.filter((a) => a && a.precio === null);
  }

  get puedeEnviar() {
    const completos = this.renglones.every(
      (r) => r.variedadId && r.presentacionId && r.cantidad && r.cantidad >= 1,
    );
    if (!completos || this.enviando()) return false;
    if (this.hayFaltante) {
      return this.opcionElegida !== null && this.cliente.trim() !== '' && this.telefono.trim() !== '';
    }
    return this.sinPrecio.length === 0;
  }

  // Si no hay nada para reservar, la única opción posible es mandar a hacer todo.
  get opcionElegida(): Opcion | null {
    return this.numeros.reservables === 0 ? 'hacer' : this.opcion;
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
    const faltante = this.hayFaltante ? this.opcionElegida! : undefined;

    this.ventas
      .registrar({
        cliente: this.cliente.trim() || undefined,
        // telefono y faltante solo van si el pedido pasa a encargue.
        telefono: faltante ? this.telefono.trim() : undefined,
        faltante,
        detalles: this.renglones.map((r) => ({
          variedadId: r.variedadId!,
          presentacionId: r.presentacionId!,
          cantidad: r.cantidad!,
        })),
      })
      .subscribe({
        next: ({ venta, encargue }) => {
          if (venta) {
            this.avisos.exito(`Venta registrada por $ ${venta.total.toLocaleString('es-AR')}.`);
          } else if (encargue) {
            const reservadas = encargue.detalles.reduce((s, d) => s + d.cantidadPreparada, 0);
            this.avisos.exito(
              `Encargue #${encargue.id} creado para ${encargue.cliente}` +
                (reservadas > 0 ? ` (${reservadas} reservadas del stock).` : '.'),
            );
          }
          this.limpiar();
        },
        error: (err) => {
          this.enviando.set(false);
          this.avisos.error(err);
          // 409 = el stock cambió desde otro lado y ya no alcanza. Recargo el stock: con
          // los números nuevos el formulario muestra solo las opciones de encargue.
          if (err instanceof HttpErrorResponse && err.status === 409) this.stock.cargar();
        },
      });
  }

  private limpiar() {
    this.renglones = [this.renglonVacio()];
    this.cliente = '';
    this.telefono = '';
    this.opcion = null;
    this.enviando.set(false);
  }

  private renglonVacio(): Renglon {
    return { variedadId: null, presentacionId: null, cantidad: 1 };
  }
}

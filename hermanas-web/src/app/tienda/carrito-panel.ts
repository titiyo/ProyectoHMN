import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CarritoService, LineaCarrito } from '../services/carrito.service';
import { pesos } from '../services/catalogo.service';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

interface DiaRetiro {
  valor: string; // "sáb 1/11"
  texto: string; // "Hoy, sáb 1/11"
  sabado: boolean;
}

// Próximos 6 días que abre el local (lunes a sábado).
function diasDeRetiro(): DiaRetiro[] {
  const lista: DiaRetiro[] = [];
  const d = new Date();
  const hoy = d.toDateString();
  while (lista.length < 6) {
    if (d.getDay() !== 0) {
      const valor = `${DIAS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
      lista.push({ valor, texto: (d.toDateString() === hoy ? 'Hoy, ' : '') + valor, sabado: d.getDay() === 6 });
    }
    d.setDate(d.getDate() + 1);
  }
  return lista;
}

// Panel lateral del carrito: renglones, total, datos de retiro y botón de WhatsApp.
@Component({
  selector: 'app-carrito-panel',
  imports: [FormsModule],
  templateUrl: './carrito-panel.html',
  styleUrl: './carrito-panel.scss',
})
export class CarritoPanel {
  protected carrito = inject(CarritoService);
  protected pesos = pesos;

  protected dias = diasDeRetiro();
  protected nombre = signal('');
  protected dia = signal('');
  protected horario = signal('');
  protected telefono = signal('');
  protected web = ''; // campo trampa: invisible para personas
  protected enviado = signal(false);

  // El sábado el local abre solo a la mañana.
  protected horarios = computed(() =>
    this.dias.find((d) => d.valor === this.dia())?.sabado
      ? ['10:00 a 11:30', '11:30 a 13:00']
      : ['9:30 a 11:30', '11:30 a 13:30', '17:30 a 19:00', '19:00 a 20:30'],
  );

  private datos = computed(() => ({
    nombre: this.nombre(),
    dia: this.dia(),
    horario: this.horario(),
    telefono: this.telefono(),
  }));

  protected mensaje = computed(() => this.carrito.mensaje(this.datos()));
  protected enlace = computed(() => this.carrito.enlaceWhatsapp(this.mensaje()));
  protected listo = computed(
    () => this.carrito.cantidad() > 0 && this.nombre().trim() !== '' && this.dia() !== '' && this.horario() !== '',
  );

  cambiarDia(valor: string) {
    this.dia.set(valor);
    if (!this.horarios().includes(this.horario())) this.horario.set('');
  }

  detalle(l: LineaCarrito) {
    const precio = l.precio.precio === null ? 'precio a confirmar' : pesos(l.subtotal);
    return `${l.precio.presentacion} · ${precio}`;
  }

  // Se ejecuta en el mismo clic que abre WhatsApp (el enlace sigue su curso solo).
  // Registrar el pedido en el panel no frena al cliente: si falla, su WhatsApp igual salió.
  enviar() {
    this.carrito.registrar(this.datos(), this.web).subscribe({ error: () => {} });
    this.enviado.set(true);
  }

  // Después de mandar: carrito nuevo para el próximo pedido.
  terminar() {
    this.carrito.vaciar();
    this.enviado.set(false);
    this.carrito.abierto.set(false);
  }
}

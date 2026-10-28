import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { EstadoPedidoWeb, PedidoWeb, PedidosWebService } from '../../services/pedidos-web.service';
import { AvisosService } from '../../services/avisos.service';
import { EncarguesService } from '../../services/encargues.service';

// Pedidos que los clientes arman en la tienda y mandan por WhatsApp.
// La vendedora los confirma por chat y los pasa a encargue (o los descarta).
@Component({
  selector: 'app-pedidos-web',
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './pedidos-web.html',
  styleUrl: './pedidos-web.scss',
})
export class PedidosWebPage implements OnInit {
  private service = inject(PedidosWebService);
  private avisos = inject(AvisosService);
  private encargues = inject(EncarguesService);

  protected filtros: { valor: EstadoPedidoWeb; texto: string }[] = [
    { valor: 'nuevo', texto: 'Nuevos' },
    { valor: 'encargue', texto: 'Pasados a encargue' },
    { valor: 'descartado', texto: 'Descartados' },
  ];
  protected filtro = signal<EstadoPedidoWeb>('nuevo');
  protected pedidos = signal<PedidoWeb[]>([]);
  protected recibe = signal<boolean | null>(null);
  protected ocupado = signal<number | null>(null);
  protected nuevos = this.service.nuevos;

  ngOnInit() {
    this.cargar();
    this.service.recibe().subscribe({
      next: (r) => this.recibe.set(r.recibirPedidosWeb),
      error: (err) => this.avisos.error(err),
    });
  }

  elegir(f: EstadoPedidoWeb) {
    this.filtro.set(f);
    this.cargar();
  }

  cargar() {
    this.service.cargarNuevos();
    this.service.listar(this.filtro()).subscribe({
      next: (p) => this.pedidos.set(p),
      error: (err) => this.avisos.error(err),
    });
  }

  cambiarRecibe(valor: boolean) {
    this.service.cambiarRecibe(valor).subscribe({
      next: (r) => {
        this.recibe.set(r.recibirPedidosWeb);
        this.avisos.exito(r.recibirPedidosWeb ? 'Los pedidos web vuelven a entrar.' : 'Pedidos web pausados: los clientes igual te escriben por WhatsApp, pero no se guardan acá.');
      },
      error: (err) => this.avisos.error(err),
    });
  }

  pasar(p: PedidoWeb) {
    this.ocupado.set(p.id);
    this.service.pasarAEncargue(p.id).subscribe({
      next: (r) => {
        this.ocupado.set(null);
        this.avisos.exito(r.message);
        this.encargues.cargarPorHacer();
        this.cargar();
      },
      error: (err) => {
        this.ocupado.set(null);
        this.avisos.error(err);
        this.cargar();
      },
    });
  }

  descartar(p: PedidoWeb) {
    if (!confirm(`¿Descartar el pedido de ${p.cliente}?`)) return;
    this.service.descartar(p.id).subscribe({
      next: (r) => {
        this.avisos.exito(r.message);
        this.cargar();
      },
      error: (err) => this.avisos.error(err),
    });
  }

  // Link para escribirle al cliente, si dejó teléfono (asume característica argentina).
  whatsapp(p: PedidoWeb) {
    const digitos = (p.telefono ?? '').replace(/\D/g, '').replace(/^0/, '');
    if (digitos.length < 8) return null;
    return `https://wa.me/${digitos.startsWith('54') ? digitos : '549' + digitos}`;
  }
}

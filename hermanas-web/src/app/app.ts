import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AvisosService } from './services/avisos.service';

// Raíz de la app: solo el <router-outlet> y los avisos, que se ven en cualquier pantalla.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    <div class="avisos">
      @for (aviso of avisos.avisos(); track aviso.id) {
        <div class="alert alert-{{ aviso.tipo }} shadow-sm d-flex align-items-start gap-2 mb-2" role="alert">
          <span class="flex-grow-1">{{ aviso.texto }}</span>
          <button type="button" class="btn-close" aria-label="Cerrar" (click)="avisos.cerrar(aviso.id)"></button>
        </div>
      }
    </div>
  `,
  styles: `
    .avisos { position: fixed; top: 1rem; right: 1rem; z-index: 1100; width: min(380px, calc(100% - 2rem)); }
  `,
})
export class App {
  protected avisos = inject(AvisosService);
}

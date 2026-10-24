import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { mensajeDeError } from '../../services/avisos.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  // Vienen de la URL (?volver=/panel/ventas&vencio=1) gracias a withComponentInputBinding().
  readonly volver = input<string>();
  readonly vencio = input<string>();

  protected usuario = '';
  protected password = '';
  protected enviando = signal(false);
  protected error = signal<string | null>(null);

  ngOnInit() {
    // Si ya tiene sesión, no tiene sentido mostrar el login.
    if (this.auth.logueado()) this.router.navigateByUrl('/panel');
  }

  entrar() {
    if (!this.usuario.trim() || !this.password) return;
    this.enviando.set(true);
    this.error.set(null);
    this.auth.login(this.usuario.trim(), this.password).subscribe({
      next: () => {
        // Solo se vuelve a rutas internas del panel (evita redirigir a otro sitio).
        const destino = this.volver()?.startsWith('/panel') ? this.volver()! : '/panel';
        this.router.navigateByUrl(destino);
      },
      error: (err) => {
        this.enviando.set(false);
        this.password = '';
        this.error.set(mensajeDeError(err));
      },
    });
  }
}

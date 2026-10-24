import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

const CLAVE = 'hermanas_token';

// Guarda el token del login y dice si la sesión sigue activa.
// El token se guarda en localStorage para que la sesión sobreviva a cerrar la pestaña
// (por eso dura 7 días). Se envuelve en try/catch porque en modo incógnito o con el
// almacenamiento bloqueado localStorage puede tirar error.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly token = signal<string | null>(leer());

  // Logueado = hay token y todavía no venció. El vencimiento ("exp") viaja dentro del
  // mismo token: un JWT son 3 partes en base64 separadas por puntos, y la del medio es
  // un JSON legible. Leerlo NO es inseguro: lo que importa es la firma, y esa la
  // verifica el backend en cada pedido.
  readonly logueado = computed(() => {
    const token = this.token();
    if (!token) return false;
    const exp = vencimiento(token);
    return exp !== null && exp > Date.now();
  });

  login(usuario: string, password: string) {
    return this.http
      .post<{ token: string }>(`${environment.apiUrl}/auth/login`, { usuario, password })
      .pipe(tap(({ token }) => this.guardar(token)));
  }

  // venció = true cuando lo dispara un 401 (para mostrar "tu sesión venció").
  salir(vencio = false) {
    this.guardar(null);
    this.router.navigate(['/login'], vencio ? { queryParams: { vencio: 1 } } : {});
  }

  private guardar(token: string | null) {
    this.token.set(token);
    try {
      if (token) localStorage.setItem(CLAVE, token);
      else localStorage.removeItem(CLAVE);
    } catch {
      // sin almacenamiento: la sesión dura mientras la pestaña esté abierta
    }
  }
}

function leer(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

// Devuelve el vencimiento en milisegundos, o null si el token está mal formado.
function vencimiento(token: string): number | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

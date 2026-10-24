import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

// Un interceptor ve pasar TODOS los pedidos de HttpClient. Acá hace dos cosas:
// 1) Le agrega el token a cada pedido a nuestra API (así los servicios no se ocupan).
// 2) Si la API responde 401 (token vencido o inválido), cierra la sesión y manda al login.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const esNuestraApi = req.url.startsWith(environment.apiUrl);

  // Los pedidos son inmutables: clone() crea una copia con el header agregado.
  const pedido =
    token && esNuestraApi
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(pedido).pipe(
    catchError((err: unknown) => {
      const esLogin = req.url.endsWith('/auth/login'); // ahí el 401 es "clave incorrecta"
      if (err instanceof HttpErrorResponse && err.status === 401 && esNuestraApi && !esLogin) {
        auth.salir(true);
      }
      return throwError(() => err); // el error sigue su camino (para los avisos)
    }),
  );
};

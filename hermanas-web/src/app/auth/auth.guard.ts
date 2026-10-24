import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Se ejecuta antes de entrar a /panel. Si no hay sesión, redirige al login
// recordando a dónde quería ir, para volver ahí después de loguearse.
// Ojo: esto solo cuida la PANTALLA. La seguridad real está en el backend (AuthGuard):
// el código del front lo puede tocar cualquiera desde el navegador.
export const panelGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.logueado()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { volver: state.url } });
};

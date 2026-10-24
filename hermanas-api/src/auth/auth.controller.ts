import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { validarCampos, validarTexto } from '../common/validaciones';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // body: { "usuario": "...", "password": "..." }  →  { token, usuario, expira }
  @Public()
  @Post('login')
  @HttpCode(200) // un login no "crea" nada, así que 200 y no el 201 por defecto de POST
  login(@Body() body: { usuario: string; password: string }) {
    validarCampos(body, ['usuario', 'password']);
    return this.authService.login(
      validarTexto(body.usuario, 'usuario'),
      validarTexto(body.password, 'password'),
    );
  }

  // Sin @Public: si el token es válido responde 200; si no, el guard da 401.
  // El front lo usa para saber si la sesión guardada sigue sirviendo.
  @Get('yo')
  yo() {
    return { ok: true };
  }
}

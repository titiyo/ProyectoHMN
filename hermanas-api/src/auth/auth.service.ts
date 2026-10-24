import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';

// Un solo usuario (la vendedora). Sus datos viven en variables de entorno:
//   ADMIN_USUARIO        nombre de usuario
//   ADMIN_PASSWORD_HASH  la contraseña hasheada con bcrypt (npm run hash -- "clave")
// Nunca se guarda la contraseña en texto plano: solo el hash, que no se puede revertir.
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(usuario: string, password: string) {
    const usuarioOk = this.config.get<string>('ADMIN_USUARIO');
    const hash = this.config.get<string>('ADMIN_PASSWORD_HASH');
    if (!usuarioOk || !hash) {
      this.logger.error('Faltan ADMIN_USUARIO o ADMIN_PASSWORD_HASH en el entorno.');
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    // Comparo la contraseña SIEMPRE, aunque el usuario esté mal, para que la respuesta
    // tarde lo mismo y no se pueda adivinar si el usuario existe midiendo el tiempo.
    const passwordOk = await compare(password, hash);
    if (usuario.trim().toLowerCase() !== usuarioOk.toLowerCase() || !passwordOk) {
      // Mismo mensaje para los dos casos, por la misma razón.
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    // El token lleva adentro el usuario ("sub") y vence según JWT_EXPIRA (7d).
    const token = await this.jwtService.signAsync({ sub: usuarioOk });
    const { exp } = this.jwtService.decode<{ exp: number }>(token);
    return { token, usuario: usuarioOk, expira: new Date(exp * 1000) };
  }
}

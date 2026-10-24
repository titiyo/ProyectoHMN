import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ES_PUBLICA } from './public.decorator';

// Guard GLOBAL (registrado en AuthModule con APP_GUARD): corre antes de CADA endpoint.
// Así, todo lo nuevo que se agregue queda protegido por defecto; para abrir algo
// hay que marcarlo a propósito con @Public(). Es más seguro que acordarse de proteger.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ¿El método o su controller tienen @Public()?
    const esPublica = this.reflector.getAllAndOverride<boolean>(ES_PUBLICA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (esPublica) return true;

    const request = context.switchToHttp().getRequest<Request>();
    // El front manda el header:  Authorization: Bearer <token>
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) {
      throw new UnauthorizedException('Tenés que iniciar sesión.');
    }
    try {
      // verifyAsync chequea la firma (que lo emitimos nosotros) y que no esté vencido.
      await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('La sesión venció. Iniciá sesión de nuevo.');
    }
    return true;
  }
}

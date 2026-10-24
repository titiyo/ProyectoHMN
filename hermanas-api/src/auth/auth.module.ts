import { Logger, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [
    // registerAsync + useFactory: la config se arma recién cuando ConfigService ya leyó el .env.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        let secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          if (process.env.NODE_ENV === 'production') {
            // En producción sin secreto no arranca: mejor caído que inseguro.
            throw new Error('Falta JWT_SECRET en las variables de entorno.');
          }
          // En desarrollo, uno al azar: las sesiones se cierran al reiniciar la API.
          secret = randomBytes(32).toString('hex');
          new Logger('AuthModule').warn('Sin JWT_SECRET: usando uno temporal.');
        }
        return {
          secret,
          signOptions: { expiresIn: config.get('JWT_EXPIRA') ?? '7d' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Registra AuthGuard para TODA la app, no solo para este módulo.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}

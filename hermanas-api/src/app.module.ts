import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoriasModule } from './categorias/categorias.module';
import { VariedadesModule } from './variedades/variedades.module';
import { SeedModule } from './seed/seed.module';
import { VentasModule } from './ventas/ventas.module';
import { EncarguesModule } from './encargues/encargues.module';
import { CatalogoModule } from './catalogo/catalogo.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // Lee el archivo .env y lo carga en process.env. Va PRIMERO para que
    // la configuración de TypeORM de abajo ya vea esas variables.
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      // Si hay DATABASE_URL (Neon en producción) se usa esa; si no, la base local de docker.
      ...(process.env.DATABASE_URL
        ? { url: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
        : {
            host: process.env.DB_HOST ?? 'localhost',
            port: parseInt(process.env.DB_PORT ?? '5435', 10),
            username: process.env.DB_USERNAME ?? 'postgres',
            password: process.env.DB_PASSWORD ?? 'secret123!',
            database: process.env.DB_NAME ?? 'hermanas',
          }),
      autoLoadEntities: true,
      synchronize: true,
    }),
    CategoriasModule,
    VariedadesModule,
    SeedModule,
    VentasModule,
    EncarguesModule,
    CatalogoModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

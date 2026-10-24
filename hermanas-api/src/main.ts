import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: qué sitios pueden llamar a la API desde el navegador.
  // FRONT_URL = lista separada por comas, ej:
  //   https://hermanas.netlify.app,https://hermanas.dpdns.org
  // Sin FRONT_URL (desarrollo) se permite cualquiera.
  const origenes = process.env.FRONT_URL?.split(',')
    .map((o) => o.trim().replace(/\/$/, '')) // sin barra final: el navegador no la manda
    .filter(Boolean);
  app.enableCors({ origin: origenes?.length ? origenes : true });

  // Render asigna el puerto en la variable PORT.
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

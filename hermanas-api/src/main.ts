import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CORS para que el front de Angular pueda llamar a la API.
  // En la Etapa 7 se restringe al dominio real del front.
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

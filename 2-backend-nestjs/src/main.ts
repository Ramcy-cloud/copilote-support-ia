import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();   // Autoriser React à appeler l'API
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

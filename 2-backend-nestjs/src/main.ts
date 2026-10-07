import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { buildCorsOptions } from './cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Seules les origines listées dans ALLOWED_ORIGINS peuvent appeler l'API depuis un navigateur
  app.enableCors(buildCorsOptions());
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

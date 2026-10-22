import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { buildCorsOptions } from './cors.config';
import { applySecurity } from './security';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Seules les origines listées dans ALLOWED_ORIGINS peuvent appeler l'API depuis un navigateur
  app.enableCors(buildCorsOptions());
  // En-têtes de sécurité, x-powered-by masqué, limitation du débit sur /copilot
  applySecurity(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

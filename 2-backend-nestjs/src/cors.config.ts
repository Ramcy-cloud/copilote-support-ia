import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

// Adresse locale du frontend Vite (valeur par défaut, jamais "*")
export const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:5173';

export function parseAllowedOrigins(
  raw: string | undefined = process.env.ALLOWED_ORIGINS,
): string[] {
  const origins = (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '' && origin !== '*');
  return origins.length > 0 ? origins : [DEFAULT_ALLOWED_ORIGIN];
}

export function buildCorsOptions(
  raw: string | undefined = process.env.ALLOWED_ORIGINS,
): CorsOptions {
  return {
    origin: parseAllowedOrigins(raw),
    methods: ['POST'],
    allowedHeaders: ['Content-Type'],
  };
}

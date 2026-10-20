import type { NextFunction, Request, Response } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';

export interface RateLimitOptions {
  /** Nombre maximal de requêtes par fenêtre et par adresse IP. */
  max: number;
  windowMs: number;
}

/** Limite lue dans l'environnement : RATE_LIMIT_MAX (défaut 20) par RATE_LIMIT_WINDOW_MS (défaut 60 000). */
export function rateLimitFromEnv(): RateLimitOptions {
  const toPositiveInt = (raw: string | undefined, fallback: number) => {
    const value = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  return {
    max: toPositiveInt(process.env.RATE_LIMIT_MAX, 20),
    windowMs: toPositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  };
}

/** Limiteur en mémoire : suffisant pour une instance unique, protège le quota du LLM. */
export function createRateLimiter({ max, windowMs }: RateLimitOptions) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (hits.size > 10_000) {
      for (const [key, entry] of hits) {
        if (entry.resetAt <= now) hits.delete(key);
      }
    }

    const key = req.ip ?? 'inconnue';
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      res.status(429).json({
        statusCode: 429,
        message: 'Trop de requêtes, réessayez plus tard',
      });
      return;
    }
    next();
  };
}

/** En-têtes de sécurité pour une API JSON (aucune page HTML n'est servie). */
export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'",
  );
  res.setHeader('Cache-Control', 'no-store');
  next();
}

export function applySecurity(
  app: NestExpressApplication,
  rateLimit: RateLimitOptions = rateLimitFromEnv(),
) {
  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use('/copilot', createRateLimiter(rateLimit));
}

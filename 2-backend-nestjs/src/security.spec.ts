import type { NextFunction, Request, Response } from 'express';
import { createRateLimiter, rateLimitFromEnv } from './security';

function appeler(
  limiter: ReturnType<typeof createRateLimiter>,
  ip = '1.2.3.4',
) {
  const res = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();
  limiter({ ip } as Request, res as unknown as Response, next as NextFunction);
  return { res, next };
}

describe('createRateLimiter', () => {
  it('laisse passer jusqu’au maximum puis répond 429', () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 60_000 });
    expect(appeler(limiter).next).toHaveBeenCalled();
    expect(appeler(limiter).next).toHaveBeenCalled();
    const bloque = appeler(limiter);
    expect(bloque.next).not.toHaveBeenCalled();
    expect(bloque.res.status).toHaveBeenCalledWith(429);
  });

  it('compte chaque adresse IP séparément', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
    appeler(limiter, '1.1.1.1');
    expect(appeler(limiter, '2.2.2.2').next).toHaveBeenCalled();
  });

  it('repart de zéro après la fenêtre', () => {
    jest.useFakeTimers();
    const limiter = createRateLimiter({ max: 1, windowMs: 1000 });
    appeler(limiter);
    expect(appeler(limiter).next).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1001);
    expect(appeler(limiter).next).toHaveBeenCalled();
    jest.useRealTimers();
  });
});

describe('rateLimitFromEnv', () => {
  afterEach(() => {
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_WINDOW_MS;
  });

  it('applique les valeurs par défaut', () => {
    expect(rateLimitFromEnv()).toEqual({ max: 20, windowMs: 60_000 });
  });

  it('lit l’environnement et ignore les valeurs invalides', () => {
    process.env.RATE_LIMIT_MAX = '5';
    process.env.RATE_LIMIT_WINDOW_MS = 'abc';
    expect(rateLimitFromEnv()).toEqual({ max: 5, windowMs: 60_000 });
  });
});

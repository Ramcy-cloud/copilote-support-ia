import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { applySecurity } from './../src/security';

describe('Sécurité de l’API (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    applySecurity(app, { max: 100, windowMs: 60_000 });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('envoie les en-têtes de sécurité et masque x-powered-by', async () => {
    const res = await request(app.getHttpServer()).get('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['content-security-policy']).toContain(
      "default-src 'none'",
    );
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it.each([
    ['corps vide', {}],
    ['sujet vide', { sujet: '  ', description: 'ok' }],
    ['description absente', { sujet: 'ok' }],
    ['sujet non texte', { sujet: { $ne: 1 }, description: 'ok' }],
    ['sujet trop long', { sujet: 'x'.repeat(201), description: 'ok' }],
    ['description trop longue', { sujet: 'ok', description: 'y'.repeat(5001) }],
  ])('refuse une requête invalide (%s) avec 400', async (_nom, body) => {
    await request(app.getHttpServer())
      .post('/copilot/ask')
      .send(body)
      .expect(400);
  });
});

describe('Limitation du débit (e2e)', () => {
  let app: NestExpressApplication;

  // Application neuve à chaque test : le quota ne dépend d'aucun autre test.
  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    applySecurity(app, { max: 3, windowMs: 60_000 });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('accepte exactement le maximum de requêtes puis répond 429 avec Retry-After', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post('/copilot/ask')
        .send({})
        .expect(400);
    }
    const res = await request(app.getHttpServer())
      .post('/copilot/ask')
      .send({})
      .expect(429);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('ne limite pas les routes hors /copilot', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).get('/').expect(200);
    }
  });
});

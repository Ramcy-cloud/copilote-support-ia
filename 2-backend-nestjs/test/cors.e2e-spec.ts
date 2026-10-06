import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { buildCorsOptions } from './../src/cors.config';

describe('CORS (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors(buildCorsOptions('https://app.example.com'));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('renvoie Access-Control-Allow-Origin pour une origine autorisée', async () => {
    const res = await request(app.getHttpServer())
      .get('/')
      .set('Origin', 'https://app.example.com');
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://app.example.com',
    );
  });

  it("n'envoie pas Access-Control-Allow-Origin pour une origine inconnue", async () => {
    const res = await request(app.getHttpServer())
      .get('/')
      .set('Origin', 'https://site-malveillant.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('refuse la préflight d\'une origine inconnue', async () => {
    const res = await request(app.getHttpServer())
      .options('/copilot/ask')
      .set('Origin', 'https://site-malveillant.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('buildCorsOptions', () => {
  it("n'autorise que le frontend local par défaut", () => {
    expect(buildCorsOptions(undefined).origin).toEqual(['http://localhost:5173']);
  });

  it('ignore le joker "*" et gère la liste séparée par des virgules', () => {
    expect(buildCorsOptions('*').origin).toEqual(['http://localhost:5173']);
    expect(buildCorsOptions('https://a.example, https://b.example').origin).toEqual(
      ['https://a.example', 'https://b.example'],
    );
  });
});

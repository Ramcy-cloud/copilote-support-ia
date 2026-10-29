import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { DataSource } from 'typeorm';
import { of } from 'rxjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('POST /copilot/ask (e2e, base en mémoire)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const httpService = { post: jest.fn() };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue(httpService)
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('la migration crée la table sans DB_SYNCHRONIZE', async () => {
    const lignes: unknown[] = await dataSource.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='tickets_historique'`,
    );
    expect(lignes).toHaveLength(1);
  });

  it('enregistre le ticket et ne renvoie pas le prompt interne', async () => {
    httpService.post.mockReturnValue(
      of({
        data: {
          status: 'success',
          sujet_analyse: 'Panne',
          resolution_suggeree: 'Redémarrer',
          prompt_utilise: 'secret',
          simulated: true,
        },
      }),
    );

    const res = await request(app.getHttpServer())
      .post('/copilot/ask')
      .send({ sujet: 'Panne', description: 'Rien ne marche' })
      .expect(201);

    expect(res.body).toEqual({
      status: 'success',
      sujet_analyse: 'Panne',
      resolution_suggeree: 'Redémarrer',
      simulated: true,
    });
    const lignes: { sujet: string; resolution_ia: string }[] =
      await dataSource.query(
        `SELECT sujet, resolution_ia FROM tickets_historique`,
      );
    expect(lignes).toEqual([{ sujet: 'Panne', resolution_ia: 'Redémarrer' }]);
  });
});

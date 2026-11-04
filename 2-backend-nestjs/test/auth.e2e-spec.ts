import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { of } from 'rxjs';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { applySecurity } from './../src/security';
import { creerCompte, jetonDeTest } from './auth.helper';

/** supertest type le corps de réponse en `any` : on le borne explicitement. */
interface CorpsConnexion {
  access_token: string;
  expires_in: string;
}
interface CorpsErreur {
  message: string;
}

// bcrypt (coût 12) prend quelques centaines de millisecondes par empreinte.
jest.setTimeout(30_000);

const IDENTIFIANT = 'technicien';
const MOT_DE_PASSE = 'mot-de-passe-de-test-valide';

describe('Authentification (e2e)', () => {
  let app: NestExpressApplication;
  const httpService = { post: jest.fn() };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue(httpService)
      .compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    // Limite de connexion volontairement haute : la force brute a son propre test.
    applySecurity(
      app,
      { max: 100, windowMs: 60_000 },
      { max: 100, windowMs: 60_000 },
    );
    await app.init();
    await creerCompte(app, IDENTIFIANT, MOT_DE_PASSE);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('renvoie un jeton exploitable pour des identifiants valides', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifiant: IDENTIFIANT, mot_de_passe: MOT_DE_PASSE })
        .expect(200);

      const corps = res.body as CorpsConnexion;
      expect(typeof corps.access_token).toBe('string');
      // Le jeton porte bien l'identité du compte.
      const charge = app
        .get(JwtService)
        .verify<{ identifiant: string }>(corps.access_token);
      expect(charge.identifiant).toBe(IDENTIFIANT);
      // Aucune trace du mot de passe ni de son empreinte dans la réponse.
      expect(JSON.stringify(corps)).not.toContain(MOT_DE_PASSE);
      expect(JSON.stringify(corps)).not.toContain('$2');
    });

    it.each([
      [
        'mot de passe faux',
        { identifiant: IDENTIFIANT, mot_de_passe: 'faux-mot-de-passe' },
      ],
      [
        'compte inconnu',
        { identifiant: 'personne', mot_de_passe: MOT_DE_PASSE },
      ],
    ])('répond 401 avec un message indistinct (%s)', async (_nom, corps) => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(corps)
        .expect(401);
      expect((res.body as CorpsErreur).message).toBe('Identifiants invalides');
    });

    it.each([
      ['corps vide', {}],
      ['identifiant absent', { mot_de_passe: MOT_DE_PASSE }],
      ['mot de passe absent', { identifiant: IDENTIFIANT }],
      [
        'identifiant non texte',
        { identifiant: { $ne: 1 }, mot_de_passe: MOT_DE_PASSE },
      ],
      [
        'mot de passe au-delà des 72 octets de bcrypt',
        { identifiant: IDENTIFIANT, mot_de_passe: 'x'.repeat(73) },
      ],
    ])('refuse une requête mal formée (%s) avec 400', async (_nom, corps) => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send(corps)
        .expect(400);
    });
  });

  describe('Garde sur /copilot/ask', () => {
    it.each([
      ['aucun en-tête', undefined],
      ['schéma inattendu', 'Basic dXNlcjpwYXNz'],
      ['Bearer sans jeton', 'Bearer'],
      ['jeton malformé', 'Bearer pas-un-jeton'],
      [
        'signature forgée avec une autre clé',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImlkZW50aWZpYW50IjoicGlyYXRlIn0.signature-invalide',
      ],
    ])('répond 401 (%s)', async (_nom, entete) => {
      const requete = request(app.getHttpServer()).post('/copilot/ask');
      if (entete) requete.set('Authorization', entete);
      await requete
        .send({ sujet: 'Panne', description: 'Rien ne marche' })
        .expect(401);
    });

    it('répond 401 pour un jeton expiré', async () => {
      const expire = await app
        .get(JwtService)
        .signAsync({ sub: 1, identifiant: IDENTIFIANT }, { expiresIn: '-10s' });

      await request(app.getHttpServer())
        .post('/copilot/ask')
        .set('Authorization', `Bearer ${expire}`)
        .send({ sujet: 'Panne', description: 'Rien ne marche' })
        .expect(401);
    });

    it('refuse le jeton avant même de valider le corps (401, pas 400)', async () => {
      await request(app.getHttpServer())
        .post('/copilot/ask')
        .send({})
        .expect(401);
    });

    it('laisse passer un jeton valide', async () => {
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

      await request(app.getHttpServer())
        .post('/copilot/ask')
        .set('Authorization', `Bearer ${await jetonDeTest(app)}`)
        .send({ sujet: 'Panne', description: 'Rien ne marche' })
        .expect(201);
    });
  });
});

describe('Force brute sur la connexion (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    applySecurity(
      app,
      { max: 100, windowMs: 60_000 },
      { max: 2, windowMs: 900_000 },
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('bloque les tentatives répétées avec 429 et Retry-After', async () => {
    for (let i = 0; i < 2; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifiant: 'personne',
          mot_de_passe: 'tentative-de-force-brute',
        })
        .expect(401);
    }
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifiant: 'personne',
        mot_de_passe: 'tentative-de-force-brute',
      })
      .expect(429);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });
});

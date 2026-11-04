import {
  DUREE_PAR_DEFAUT,
  LONGUEUR_MIN_SECRET,
  authConfigFromEnv,
} from './auth.config';

describe('authConfigFromEnv', () => {
  const secretValide = 'x'.repeat(LONGUEUR_MIN_SECRET);
  let environnementInitial: NodeJS.ProcessEnv;

  beforeEach(() => {
    environnementInitial = { ...process.env };
  });

  afterEach(() => {
    process.env = environnementInitial;
  });

  it('refuse de démarrer sans JWT_SECRET', () => {
    delete process.env.JWT_SECRET;
    expect(() => authConfigFromEnv()).toThrow(/JWT_SECRET est obligatoire/);
  });

  it('refuse un secret trop court pour être résistant', () => {
    process.env.JWT_SECRET = 'x'.repeat(LONGUEUR_MIN_SECRET - 1);
    expect(() => authConfigFromEnv()).toThrow(
      new RegExp(`${LONGUEUR_MIN_SECRET} caractères`),
    );
  });

  it('accepte un secret suffisant et applique 1h par défaut', () => {
    process.env.JWT_SECRET = secretValide;
    delete process.env.JWT_EXPIRES_IN;
    expect(authConfigFromEnv()).toEqual({
      secret: secretValide,
      expiresIn: DUREE_PAR_DEFAUT,
    });
  });

  it('respecte JWT_EXPIRES_IN', () => {
    process.env.JWT_SECRET = secretValide;
    process.env.JWT_EXPIRES_IN = '15m';
    expect(authConfigFromEnv().expiresIn).toBe('15m');
  });

  it.each(['une heure', '1 heure', 'bientot', '15x'])(
    'refuse une durée au format invalide (%s)',
    (duree) => {
      process.env.JWT_SECRET = secretValide;
      process.env.JWT_EXPIRES_IN = duree;
      expect(() => authConfigFromEnv()).toThrow(/JWT_EXPIRES_IN/);
    },
  );

  it('retombe sur la durée par défaut si la variable est vide', () => {
    process.env.JWT_SECRET = secretValide;
    process.env.JWT_EXPIRES_IN = '   ';
    expect(authConfigFromEnv().expiresIn).toBe(DUREE_PAR_DEFAUT);
  });
});

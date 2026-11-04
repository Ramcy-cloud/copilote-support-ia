import type { JwtModuleOptions } from '@nestjs/jwt';

/**
 * Type exact attendu par jsonwebtoken : un nombre de secondes, ou une durée
 * littérale ('15m', '1h'...). Dérivé de @nestjs/jwt pour ne pas dépendre
 * directement de « ms », qui n'est qu'une dépendance transitive.
 */
export type DureeValidite = NonNullable<
  NonNullable<JwtModuleOptions['signOptions']>['expiresIn']
>;

export interface AuthConfig {
  secret: string;
  expiresIn: DureeValidite;
}

/** Une clé plus courte est devinable hors ligne : on refuse de démarrer. */
export const LONGUEUR_MIN_SECRET = 32;

export const DUREE_PAR_DEFAUT = '1h';

/** Formats acceptés par « ms » : « 3600 » (secondes) ou « 15m », « 1h », « 7d »... */
const FORMAT_DUREE = /^\d+(\.\d+)?\s*(ms|s|m|h|d|w|y)?$/i;

/**
 * Lit JWT_SECRET et JWT_EXPIRES_IN dans l'environnement.
 *
 * Volontairement sans valeur par défaut pour le secret : un secret codé en dur
 * rendrait tous les jetons forgeables par quiconque lit le dépôt. Mieux vaut un
 * démarrage qui échoue qu'une authentification qui ne protège rien.
 */
export function authConfigFromEnv(): AuthConfig {
  const secret = process.env.JWT_SECRET ?? '';
  if (secret.length < LONGUEUR_MIN_SECRET) {
    throw new Error(
      `JWT_SECRET est obligatoire et doit faire au moins ${LONGUEUR_MIN_SECRET} caractères. ` +
        "Générez-en un avec : node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
    );
  }

  const dureeBrute = process.env.JWT_EXPIRES_IN?.trim() || DUREE_PAR_DEFAUT;
  if (!FORMAT_DUREE.test(dureeBrute)) {
    throw new Error(
      `JWT_EXPIRES_IN « ${dureeBrute} » est invalide. Attendu : un nombre de secondes ` +
        '(« 3600 ») ou une durée (« 15m », « 1h », « 7d »).',
    );
  }

  // Le type littéral de jsonwebtoken n'est pas vérifiable à la compilation sur
  // une variable d'environnement : la conversion suit la validation ci-dessus.
  return { secret, expiresIn: dureeBrute as DureeValidite };
}

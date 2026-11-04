import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './../src/auth/auth.service';
import { UserEntity } from './../src/auth/user.entity';

/**
 * Jeton signé directement avec la clé de l'application. Les tests qui portent
 * sur la validation, le débit ou le CORS n'ont pas à payer le coût bcrypt d'une
 * vraie connexion : seul le garde est traversé, et il ne vérifie qu'une signature.
 */
export function jetonDeTest(
  app: INestApplication,
  identifiant = 'technicien',
): Promise<string> {
  return app.get(JwtService).signAsync({ sub: 1, identifiant });
}

/** En-tête prêt à l'emploi : `.set(...(await enteteAuth(app)))`. */
export async function enteteAuth(
  app: INestApplication,
): Promise<[string, string]> {
  return ['Authorization', `Bearer ${await jetonDeTest(app)}`];
}

/**
 * Crée un vrai compte en base (empreinte bcrypt comprise). Réservé aux tests
 * qui exercent réellement la connexion.
 */
export async function creerCompte(
  app: INestApplication,
  identifiant: string,
  motDePasse: string,
): Promise<void> {
  const depot = app.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
  await depot.insert({
    identifiant,
    mot_de_passe_hash: await AuthService.hacherMotDePasse(motDePasse),
  });
}

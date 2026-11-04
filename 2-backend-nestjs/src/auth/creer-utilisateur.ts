/**
 * Crée (ou remplace) un compte autorisé à interroger le copilote.
 *
 *   npm run utilisateur:creer -- <identifiant> [--remplacer]
 *
 * Le mot de passe n'est JAMAIS passé en argument : il serait visible dans
 * l'historique du shell et dans la liste des processus. Il est lu dans la
 * variable NOUVEAU_MOT_DE_PASSE, sinon sur l'entrée standard.
 */
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import {
  AuthService,
  MAX_IDENTIFIANT,
  MAX_MOT_DE_PASSE,
  MIN_MOT_DE_PASSE,
} from './auth.service';
import { UserEntity } from './user.entity';

function lireEntreeStandard(): Promise<string> {
  return new Promise((resolve, reject) => {
    let donnees = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (morceau: string) => (donnees += morceau));
    process.stdin.on('end', () => resolve(donnees.trim()));
    process.stdin.on('error', reject);
  });
}

async function principal(): Promise<void> {
  const arguments_ = process.argv.slice(2);
  const remplacer = arguments_.includes('--remplacer');
  const identifiant = arguments_.find((a) => !a.startsWith('--'))?.trim();

  if (!identifiant) {
    throw new Error(
      'Identifiant manquant. Usage : npm run utilisateur:creer -- <identifiant> [--remplacer]',
    );
  }
  if (identifiant.length > MAX_IDENTIFIANT) {
    throw new Error(`L'identifiant dépasse ${MAX_IDENTIFIANT} caractères.`);
  }

  const motDePasse =
    process.env.NOUVEAU_MOT_DE_PASSE?.trim() || (await lireEntreeStandard());

  if (motDePasse.length < MIN_MOT_DE_PASSE) {
    throw new Error(
      `Le mot de passe doit faire au moins ${MIN_MOT_DE_PASSE} caractères (reçu : ${motDePasse.length}).`,
    );
  }
  if (Buffer.byteLength(motDePasse, 'utf8') > MAX_MOT_DE_PASSE) {
    throw new Error(
      `Le mot de passe dépasse ${MAX_MOT_DE_PASSE} octets, au-delà desquels bcrypt ignore la suite.`,
    );
  }

  const contexte = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const depot = contexte.get<Repository<UserEntity>>(
      getRepositoryToken(UserEntity),
    );
    const existant = await depot.findOne({ where: { identifiant } });

    if (existant && !remplacer) {
      throw new Error(
        `Le compte « ${identifiant} » existe déjà. Ajoutez --remplacer pour changer son mot de passe.`,
      );
    }

    const mot_de_passe_hash = await AuthService.hacherMotDePasse(motDePasse);
    if (existant) {
      await depot.update(existant.id, { mot_de_passe_hash });
      console.log(`Mot de passe du compte « ${identifiant} » remplace.`);
    } else {
      await depot.insert({ identifiant, mot_de_passe_hash });
      console.log(`Compte « ${identifiant} » cree.`);
    }
  } finally {
    await contexte.close();
  }
}

principal().catch((erreur: unknown) => {
  console.error(erreur instanceof Error ? erreur.message : erreur);
  process.exitCode = 1;
});

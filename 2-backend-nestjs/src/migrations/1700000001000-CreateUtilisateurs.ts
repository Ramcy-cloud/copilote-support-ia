import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crée la table des comptes autorisés à interroger le copilote.
 * Aucun compte n'est inséré : voir « npm run utilisateur:creer ».
 */
export class CreateUtilisateurs1700000001000 implements MigrationInterface {
  name = 'CreateUtilisateurs1700000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "utilisateurs" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "identifiant" varchar NOT NULL,
        "mot_de_passe_hash" varchar NOT NULL,
        "date_creation" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "UQ_utilisateurs_identifiant" UNIQUE ("identifiant")
      )`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "utilisateurs"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crée la table de l'historique au premier démarrage, sans DB_SYNCHRONIZE.
 * IF NOT EXISTS : sans effet si la table a déjà été créée par la synchronisation.
 */
export class CreateTicketsHistorique1700000000000 implements MigrationInterface {
  name = 'CreateTicketsHistorique1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "tickets_historique" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "sujet" varchar NOT NULL,
        "description" text NOT NULL,
        "resolution_ia" text NOT NULL,
        "date_creation" datetime NOT NULL DEFAULT (datetime('now'))
      )`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tickets_historique"`);
  }
}

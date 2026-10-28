import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShadowingAttemptMetadata20261020000100 implements MigrationInterface {
  name = 'AddShadowingAttemptMetadata20261020000100';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_attempts
        ADD COLUMN IF NOT EXISTS error_code VARCHAR(40),
        ADD COLUMN IF NOT EXISTS is_discarded BOOLEAN NOT NULL DEFAULT FALSE
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_user_attempts_pending_shadowing ON user_attempts(status, created_at) WHERE type = 'SHADOWING' AND is_discarded = FALSE`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_user_attempts_pending_shadowing');
    await queryRunner.query('ALTER TABLE user_attempts DROP COLUMN IF EXISTS error_code, DROP COLUMN IF EXISTS is_discarded');
  }
}

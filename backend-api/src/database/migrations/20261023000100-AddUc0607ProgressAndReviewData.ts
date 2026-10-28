import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUc0607ProgressAndReviewData20261023000100 implements MigrationInterface {
  name = 'AddUc0607ProgressAndReviewData20261023000100';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE streak_logs
        ADD COLUMN IF NOT EXISTS daily_points INTEGER NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE review_lists
        ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) NOT NULL DEFAULT 'LEGACY',
        ADD COLUMN IF NOT EXISTS accuracy_score INTEGER,
        ADD COLUMN IF NOT EXISTS error_type VARCHAR(30),
        ADD COLUMN IF NOT EXISTS last_attempt_id UUID,
        ADD COLUMN IF NOT EXISTS correct_streak INTEGER NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE review_lists
          ADD CONSTRAINT fk_review_lists_last_attempt
          FOREIGN KEY (last_attempt_id) REFERENCES user_attempts(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE review_lists DROP CONSTRAINT IF EXISTS fk_review_lists_last_attempt');
    await queryRunner.query(`
      ALTER TABLE review_lists
        DROP COLUMN IF EXISTS correct_streak,
        DROP COLUMN IF EXISTS last_attempt_id,
        DROP COLUMN IF EXISTS error_type,
        DROP COLUMN IF EXISTS accuracy_score,
        DROP COLUMN IF EXISTS source_type
    `);
    await queryRunner.query('ALTER TABLE streak_logs DROP COLUMN IF EXISTS daily_points');
  }
}

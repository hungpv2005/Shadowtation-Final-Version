import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrivateDictationLessons20261013000200 implements MigrationInterface {
  name = 'AddPrivateDictationLessons20261013000200';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lessons
        ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
        ADD COLUMN IF NOT EXISTS created_by_user_id UUID
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_lessons_created_by_user' AND conrelid = 'lessons'::regclass
        ) THEN
          ALTER TABLE lessons ADD CONSTRAINT fk_lessons_created_by_user
            FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_lessons_created_by_user ON lessons(created_by_user_id)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_lessons_created_by_user');
    await queryRunner.query('ALTER TABLE lessons DROP CONSTRAINT IF EXISTS fk_lessons_created_by_user');
    await queryRunner.query('ALTER TABLE lessons DROP COLUMN IF EXISTS created_by_user_id, DROP COLUMN IF EXISTS duration_seconds');
  }
}

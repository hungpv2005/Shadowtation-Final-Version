import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLessonMediaMetadata20261013000100 implements MigrationInterface {
  name = 'AddLessonMediaMetadata20261013000100';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lessons
        ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) NOT NULL DEFAULT 'AUDIO',
        ADD COLUMN IF NOT EXISTS source_name VARCHAR(150),
        ADD COLUMN IF NOT EXISTS source_url VARCHAR(500)
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_lessons_media_type' AND conrelid = 'lessons'::regclass
        ) THEN
          ALTER TABLE lessons ADD CONSTRAINT chk_lessons_media_type
            CHECK (media_type IN ('AUDIO', 'VIDEO', 'PODCAST'));
        END IF;
      END $$
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE lessons DROP CONSTRAINT IF EXISTS chk_lessons_media_type');
    await queryRunner.query('ALTER TABLE lessons DROP COLUMN IF EXISTS source_url, DROP COLUMN IF EXISTS source_name, DROP COLUMN IF EXISTS media_type');
  }
}

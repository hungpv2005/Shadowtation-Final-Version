import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLessonSentenceOrderIndex20261013000300 implements MigrationInterface {
  name = 'AddLessonSentenceOrderIndex20261013000300';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE lesson_sentences ADD COLUMN IF NOT EXISTS order_index INTEGER');
    await queryRunner.query(`
      WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY lesson_id ORDER BY start_time, id) AS position
        FROM lesson_sentences
      )
      UPDATE lesson_sentences AS sentence
      SET order_index = ordered.position
      FROM ordered
      WHERE sentence.id = ordered.id
    `);
    await queryRunner.query('ALTER TABLE lesson_sentences ALTER COLUMN order_index SET NOT NULL');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_sentences_order ON lesson_sentences(lesson_id, order_index)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_lesson_sentences_order');
    await queryRunner.query('ALTER TABLE lesson_sentences DROP COLUMN IF EXISTS order_index');
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssessmentSource20261022000100 implements MigrationInterface {
  name = 'AddAssessmentSource20261022000100';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE scores
        ADD COLUMN IF NOT EXISTS assessment_source VARCHAR(20) NOT NULL DEFAULT 'LEGACY'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE scores DROP COLUMN IF EXISTS assessment_source');
  }
}

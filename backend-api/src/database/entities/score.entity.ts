import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { UserAttempt } from './user-attempt.entity';

export type WordErrorType = 'None' | 'Mispronunciation' | 'Substitution' | 'Omission' | 'Insertion';

export interface WordScore {
  word: string;
  accuracy_score: number;
  error_type: WordErrorType;
  color?: 'GREEN' | 'YELLOW' | 'RED';
}

export type AssessmentSource = 'OPENAI' | 'MOCK' | 'LEGACY';

@Entity('scores')
export class Score {
  @PrimaryColumn({ name: 'attempt_id', type: 'uuid' })
  attemptId!: string;

  @OneToOne(() => UserAttempt, (attempt) => attempt.score, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt!: UserAttempt;

  @Column({ name: 'overall_score', type: 'int' })
  overallScore!: number;

  @Column({ name: 'assessment_source', type: 'varchar', length: 20, default: 'LEGACY' })
  assessmentSource!: AssessmentSource;

  @Column({ name: 'accuracy_score', type: 'int' })
  accuracyScore!: number;

  @Column({ name: 'fluency_score', type: 'int', nullable: true })
  fluencyScore!: number | null;

  @Column({ name: 'completeness_score', type: 'int', nullable: true })
  completenessScore!: number | null;

  @Column({ name: 'words_score_detail', type: 'jsonb', default: () => `'[]'::jsonb` })
  wordsScoreDetail!: WordScore[];
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LessonSentence } from './lesson-sentence.entity';
import { User } from './user.entity';
import { Score } from './score.entity';

export type AttemptType = 'DICTATION' | 'SHADOWING';
export type AttemptStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

@Entity('user_attempts')
@Index('idx_user_attempts_user_created', ['userId', 'createdAt'])
@Index('idx_user_attempts_status', ['status'])
export class UserAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'sentence_id', type: 'uuid' })
  sentenceId!: string;

  @ManyToOne(() => LessonSentence, (sentence) => sentence.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sentence_id' })
  sentence!: LessonSentence;

  @Column({ name: 'audio_url', type: 'varchar', length: 500, nullable: true })
  audioUrl!: string | null;

  @Column({ name: 'text_input', type: 'text', nullable: true })
  textInput!: string | null;

  @Column({ type: 'varchar', length: 20 })
  type!: AttemptType;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status!: AttemptStatus;

  @Column({ name: 'error_code', type: 'varchar', length: 40, nullable: true })
  errorCode!: string | null;

  @Column({ name: 'is_discarded', type: 'boolean', default: false })
  isDiscarded!: boolean;

  @Column({ name: 'used_transcript_hint', type: 'boolean', default: false })
  usedTranscriptHint!: boolean;

  @OneToOne(() => Score, (score) => score.attempt)
  score!: Score;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}

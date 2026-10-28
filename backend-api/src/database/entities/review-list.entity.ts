import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { UserAttempt } from './user-attempt.entity';

export type ReviewSource = 'DICTATION' | 'SHADOWING' | 'LEGACY';

@Entity('review_lists')
@Unique('uq_review_lists_user_word', ['userId', 'weakWord'])
@Index('idx_review_lists_user_priority', ['userId', 'priorityScore'])
export class ReviewList {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'weak_word', type: 'varchar', length: 100 })
  weakWord!: string;

  @Column({ name: 'wrong_count', type: 'int', default: 1 })
  wrongCount!: number;

  @Column({ name: 'source_type', type: 'varchar', length: 20, default: 'LEGACY' })
  sourceType!: ReviewSource;

  @Column({ name: 'accuracy_score', type: 'int', nullable: true })
  accuracyScore!: number | null;

  @Column({ name: 'error_type', type: 'varchar', length: 30, nullable: true })
  errorType!: string | null;

  @Column({ name: 'last_attempt_id', type: 'uuid', nullable: true })
  lastAttemptId!: string | null;

  @ManyToOne(() => UserAttempt, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_attempt_id' })
  lastAttempt!: UserAttempt | null;

  @Column({ name: 'correct_streak', type: 'int', default: 0 })
  correctStreak!: number;

  @Column({ name: 'priority_score', type: 'real', default: 0 })
  priorityScore!: number;

  @CreateDateColumn({ name: 'added_at', type: 'timestamp' })
  addedAt!: Date;
}

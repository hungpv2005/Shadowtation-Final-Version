import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LessonSentence } from './lesson-sentence.entity';

export type LessonLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type LessonStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type LessonMediaType = 'AUDIO' | 'VIDEO' | 'PODCAST';

@Entity('lessons')
@Index('idx_lessons_status_level', ['status', 'level'])
@Index('idx_lessons_created_by_user', ['createdByUserId'])
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 20 })
  level!: LessonLevel;

  @Column({ name: 'audio_url', type: 'varchar', length: 500 })
  audioUrl!: string;

  @Column({ name: 'media_type', type: 'varchar', length: 20, default: 'AUDIO' })
  mediaType!: LessonMediaType;

  @Column({ name: 'source_name', type: 'varchar', length: 150, nullable: true })
  sourceName!: string | null;

  @Column({ name: 'source_url', type: 'varchar', length: 500, nullable: true })
  sourceUrl!: string | null;

  @Column({ name: 'duration_seconds', type: 'integer', nullable: true })
  durationSeconds!: number | null;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId!: string | null;

  @Column({ name: 'is_premium_only', type: 'boolean', default: false })
  isPremiumOnly!: boolean;

  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status!: LessonStatus;

  @OneToMany(() => LessonSentence, (sentence) => sentence.lesson)
  sentences!: LessonSentence[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}

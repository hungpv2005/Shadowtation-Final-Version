import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Lesson } from './lesson.entity';
import { UserAttempt } from './user-attempt.entity';

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

@Entity('lesson_sentences')
@Index('idx_lesson_sentences_lesson', ['lessonId', 'startTime'])
@Index('idx_lesson_sentences_order', ['lessonId', 'orderIndex'], { unique: true })
export class LessonSentence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId!: string;

  @Column({ name: 'order_index', type: 'integer' })
  orderIndex!: number;

  @ManyToOne(() => Lesson, (lesson) => lesson.sentences, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson!: Lesson;

  @Column({ name: 'start_time', type: 'real' })
  startTime!: number;

  @Column({ name: 'end_time', type: 'real' })
  endTime!: number;

  @Column({ name: 'text_content', type: 'text' })
  textContent!: string;

  @Column({ name: 'words_json', type: 'jsonb', default: () => `'[]'::jsonb` })
  wordsJson!: WordTiming[];

  @OneToMany(() => UserAttempt, (attempt) => attempt.sentence)
  attempts!: UserAttempt[];
}

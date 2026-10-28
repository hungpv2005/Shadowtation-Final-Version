import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from './user.entity';

@Entity('streak_logs')
@Unique('uq_streak_logs_user_date', ['userId', 'studyDate'])
export class StreakLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'study_date', type: 'date', default: () => 'CURRENT_DATE' })
  studyDate!: string;

  @Column({ name: 'daily_points', type: 'int', default: 0 })
  dailyPoints!: number;
}

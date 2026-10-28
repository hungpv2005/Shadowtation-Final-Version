import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserAttempt } from './user-attempt.entity';
import { StreakLog } from './streak-log.entity';
import { ReviewList } from './review-list.entity';
import { PaymentTransaction } from './payment-transaction.entity';
import { RefreshToken } from './refresh-token.entity';

export enum UserRole {
  STUDENT = 'STUDENT',
  PREMIUM_STUDENT = 'PREMIUM_STUDENT',
  ADMIN = 'ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 150, name: 'full_name' })
  fullName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'avatar_url' })
  avatarUrl!: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role!: UserRole;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'integer', default: 0, name: 'streak_count' })
  streakCount!: number;

  @Column({ type: 'timestamp', nullable: true, name: 'premium_expired_at' })
  premiumExpiredAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => UserAttempt, (attempt: UserAttempt) => attempt.user)
  attempts!: UserAttempt[];

  @OneToMany(() => StreakLog, (log: StreakLog) => log.user)
  streakLogs!: StreakLog[];

  @OneToMany(() => ReviewList, (review: ReviewList) => review.user)
  reviewLists!: ReviewList[];

  @OneToMany(() => PaymentTransaction, (transaction: PaymentTransaction) => transaction.user)
  paymentTransactions!: PaymentTransaction[];

  @OneToMany(() => RefreshToken, (token: RefreshToken) => token.user)
  refreshTokens!: RefreshToken[];
}

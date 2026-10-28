import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReviewList, ReviewSource } from '../database/entities/review-list.entity';
import { User, UserRole } from '../database/entities/user.entity';

type ProgressPeriod = '7d' | '30d' | 'all';

@Injectable()
export class LearningService {
  constructor(private readonly dataSource: DataSource) {}

  async getProgress(userId: string, requestedPeriod?: string) {
    const period = this.readPeriod(requestedPeriod);
    const user = await this.getActiveUser(userId);
    const [summary] = await this.dataSource.query(
      `SELECT COUNT(attempt.id)::int AS attempt_count,
              COALESCE(ROUND(AVG(score.overall_score)), 0)::int AS accuracy_rate,
              COALESCE(SUM(GREATEST(sentence.end_time - sentence.start_time, 0)), 0)::int AS study_seconds
         FROM user_attempts attempt
         INNER JOIN scores score ON score.attempt_id = attempt.id
         INNER JOIN lesson_sentences sentence ON sentence.id = attempt.sentence_id
        WHERE attempt.user_id = $1
          AND attempt.status = 'COMPLETED'
          AND attempt.is_discarded = FALSE
          AND ($2::text = 'all' OR attempt.created_at >= CURRENT_DATE - CASE WHEN $2::text = '7d' THEN 6 ELSE 29 END)`,
      [userId, period],
    ) as Array<{ attempt_count: number; accuracy_rate: number; study_seconds: number }>;

    const chart = await this.dataSource.query(
      `WITH activity AS (
         SELECT DATE_TRUNC($3::text, attempt.created_at)::date AS date,
                COUNT(attempt.id)::int AS attempts,
                ROUND(AVG(score.overall_score))::int AS accuracy_rate,
                SUM(GREATEST(sentence.end_time - sentence.start_time, 0))::int AS study_seconds
           FROM user_attempts attempt
           INNER JOIN scores score ON score.attempt_id = attempt.id
           INNER JOIN lesson_sentences sentence ON sentence.id = attempt.sentence_id
          WHERE attempt.user_id = $1
            AND attempt.status = 'COMPLETED'
            AND attempt.is_discarded = FALSE
            AND ($2::text = 'all' OR attempt.created_at >= CURRENT_DATE - CASE WHEN $2::text = '7d' THEN 6 ELSE 29 END)
          GROUP BY DATE_TRUNC($3::text, attempt.created_at)
       ), bounds AS (
         SELECT CASE WHEN $2::text = 'all' THEN (SELECT MIN(date) FROM activity)
                     WHEN $2::text = '7d' THEN CURRENT_DATE - 6 ELSE CURRENT_DATE - 29 END AS start_date,
                CASE WHEN $2::text = 'all' THEN DATE_TRUNC('week', CURRENT_DATE::timestamp)::date ELSE CURRENT_DATE END AS end_date
       ), calendar AS (
         SELECT GENERATE_SERIES(bounds.start_date::timestamp, bounds.end_date::timestamp,
                                CASE WHEN $2::text = 'all' THEN INTERVAL '1 week' ELSE INTERVAL '1 day' END) AS date
           FROM bounds WHERE bounds.start_date IS NOT NULL
       )
       SELECT TO_CHAR(calendar.date, 'YYYY-MM-DD') AS date,
              COALESCE(activity.attempts, 0)::int AS attempts,
              activity.accuracy_rate,
              COALESCE(activity.study_seconds, 0)::int AS study_seconds
         FROM calendar LEFT JOIN activity ON activity.date = calendar.date::date
        ORDER BY calendar.date`,
      [userId, period, period === 'all' ? 'week' : 'day'],
    ) as Array<{ date: string; attempts: number; accuracy_rate: number | null; study_seconds: number }>;

    const streak = await this.readStreak(userId, user.streakCount);
    const today = await this.dataSource.query(
      `SELECT COALESCE(daily_points, 0)::int AS daily_points
         FROM streak_logs WHERE user_id = $1 AND study_date = CURRENT_DATE`,
      [userId],
    ) as Array<{ daily_points: number }>;
    const reviewCount = await this.dataSource.getRepository(ReviewList).countBy({ userId });
    const recommendations = await this.getReviewItems(userId, undefined, undefined, 5);

    return {
      period,
      account: {
        role: user.role,
        isPremium: user.role === UserRole.ADMIN || (user.role === UserRole.PREMIUM_STUDENT && !!user.premiumExpiredAt && user.premiumExpiredAt > new Date()),
        premiumExpiredAt: user.premiumExpiredAt,
      },
      summary: {
        completedAttempts: Number(summary?.attempt_count ?? 0),
        accuracyRate: Number(summary?.accuracy_rate ?? 0),
        studySeconds: Number(summary?.study_seconds ?? 0),
        currentStreak: streak.currentStreak,
        dailyPoints: Number(today[0]?.daily_points ?? 0),
        reviewWordCount: reviewCount,
      },
      chart: chart.map((point) => ({
        date: point.date,
        attempts: Number(point.attempts),
        accuracyRate: point.accuracy_rate === null ? null : Number(point.accuracy_rate),
        studySeconds: Number(point.study_seconds),
      })),
      reviewPreview: recommendations,
    };
  }

  async getStreakLogs(userId: string, requestedDays?: string) {
    const user = await this.getActiveUser(userId);
    const parsedDays = Number(requestedDays ?? 35);
    const days = Number.isInteger(parsedDays) ? Math.max(7, Math.min(90, parsedDays)) : 35;
    const logs = await this.dataSource.query(
      `SELECT TO_CHAR(calendar.study_date::date, 'YYYY-MM-DD') AS study_date,
              (streak.id IS NOT NULL) AS is_active,
              COALESCE(streak.daily_points, 0)::int AS daily_points
         FROM generate_series(CURRENT_DATE - ($2::int - 1), CURRENT_DATE, INTERVAL '1 day') AS calendar(study_date)
         LEFT JOIN streak_logs streak
           ON streak.user_id = $1 AND streak.study_date = calendar.study_date::date
        ORDER BY calendar.study_date`,
      [userId, days],
    ) as Array<{ study_date: string; is_active: boolean; daily_points: number }>;
    const streak = await this.readStreak(userId, user.streakCount);
    return {
      currentStreak: streak.currentStreak,
      days: logs.map((row) => ({ date: row.study_date, isActive: row.is_active, dailyPoints: Number(row.daily_points) })),
    };
  }

  async getReviewList(userId: string, requestedSource?: string, search?: string) {
    await this.getActiveUser(userId);
    const source = requestedSource?.trim().toUpperCase();
    if (source && !['DICTATION', 'SHADOWING'].includes(source)) {
      throw new BadRequestException('Nguồn ôn tập không hợp lệ.');
    }
    const items = await this.getReviewItems(userId, source as ReviewSource | undefined, search);
    return {
      count: items.length,
      summary: {
        dictation: items.filter((item) => item.source === 'DICTATION').length,
        shadowing: items.filter((item) => item.source === 'SHADOWING').length,
        legacy: items.filter((item) => item.source === 'LEGACY').length,
      },
      items,
    };
  }

  async answerReviewWord(userId: string, id: string, submittedAnswer: unknown) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new BadRequestException('Từ ôn tập không hợp lệ.');
    }
    if (typeof submittedAnswer !== 'string' || !submittedAnswer.trim() || submittedAnswer.length > 120) {
      throw new BadRequestException('Hãy nhập từ cần ôn tập.');
    }
    await this.getActiveUser(userId);
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ReviewList);
      const item = await repository.createQueryBuilder('review')
        .setLock('pessimistic_write')
        .where('review.id = :id AND review.userId = :userId', { id, userId })
        .getOne();
      if (!item) throw new NotFoundException('Từ này không còn trong danh sách ôn tập.');

      const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}']/gu, '');
      const isCorrect = normalize(submittedAnswer) === normalize(item.weakWord);
      if (!isCorrect) {
        await repository.update(item.id, {
          wrongCount: item.wrongCount + 1,
          correctStreak: 0,
          priorityScore: Number(item.priorityScore) + 1,
        });
        return { isCorrect: false, correctStreak: 0, removed: false, expectedWord: item.weakWord };
      }

      const correctStreak = item.correctStreak + 1;
      if (correctStreak >= 2) {
        await repository.delete({ id: item.id, userId });
        return { isCorrect: true, correctStreak, removed: true, expectedWord: item.weakWord };
      }
      await repository.update(item.id, {
        correctStreak,
        priorityScore: Math.max(0, Number(item.priorityScore) * 0.5),
      });
      return { isCorrect: true, correctStreak, removed: false, expectedWord: item.weakWord };
    });
  }

  async deleteReviewWord(userId: string, id: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new BadRequestException('ID từ ôn tập không hợp lệ.');
    }
    await this.getActiveUser(userId);
    await this.dataSource.getRepository(ReviewList).delete({ id, userId });
    return { success: true };
  }

  async clearReviewList(userId: string) {
    await this.getActiveUser(userId);
    await this.dataSource.getRepository(ReviewList).delete({ userId });
    return { success: true };
  }


  private async getReviewItems(userId: string, source?: ReviewSource, search?: string, take?: number) {
    const query = this.dataSource.getRepository(ReviewList).createQueryBuilder('review')
      .leftJoinAndSelect('review.lastAttempt', 'attempt')
      .leftJoinAndSelect('attempt.sentence', 'sentence')
      .leftJoinAndSelect('sentence.lesson', 'lesson')
      .where('review.userId = :userId', { userId });
    if (source) query.andWhere('review.sourceType = :source', { source });
    if (search?.trim()) query.andWhere('LOWER(review.weakWord) LIKE :search', { search: `%${search.trim().toLocaleLowerCase('en-US')}%` });
    query.orderBy('review.priorityScore', 'DESC').addOrderBy('review.addedAt', 'ASC');
    if (take) query.take(take);
    const rows = await query.getMany();
    return rows.map((item) => ({
      id: item.id,
      word: item.weakWord,
      source: item.sourceType,
      accuracyScore: item.accuracyScore,
      errorType: item.errorType,
      wrongCount: item.wrongCount,
      priorityScore: Number(item.priorityScore),
      correctStreak: item.correctStreak,
      addedAt: item.addedAt,
      lastAttemptAt: item.lastAttempt?.createdAt ?? null,
      sentence: item.lastAttempt?.sentence?.textContent ?? null,
      lessonTitle: item.lastAttempt?.sentence?.lesson?.title ?? null,
    }));
  }

  private async getActiveUser(userId: string) {
    const user = await this.dataSource.getRepository(User).findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản.');
    if (!user.isActive) throw new ForbiddenException('Tài khoản hiện không hoạt động.');
    return user;
  }

  private readPeriod(value?: string): ProgressPeriod {
    const period = (value ?? '7d').toLowerCase();
    if (period !== '7d' && period !== '30d' && period !== 'all') {
      throw new BadRequestException('Khoảng thời gian phải là 7d, 30d hoặc all.');
    }
    return period;
  }

  private async readStreak(userId: string, streakCount: number) {
    const [row] = await this.dataSource.query(
      `SELECT CURRENT_DATE::text AS today, MAX(study_date)::text AS latest_date
         FROM streak_logs WHERE user_id = $1`, [userId],
    ) as Array<{ today: string; latest_date: string | null }>;
    const dayNumber = (date: string) => Date.parse(`${date.slice(0, 10)}T00:00:00Z`);
    const gap = row?.latest_date ? Math.round((dayNumber(row.today) - dayNumber(row.latest_date)) / 86_400_000) : null;
    return { currentStreak: gap === 0 || gap === 1 ? streakCount : 0 };
  }
}

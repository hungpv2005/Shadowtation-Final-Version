import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Lesson, LessonLevel, LessonMediaType } from '../../database/entities/lesson.entity';
import { LessonSentence } from '../../database/entities/lesson-sentence.entity';
import { Score } from '../../database/entities/score.entity';
import { User, UserRole } from '../../database/entities/user.entity';
import { UserAttempt } from '../../database/entities/user-attempt.entity';
import { SystemConfig } from '../../database/entities/system-config.entity';
import { hintPenalty, normalizeWords, scoreDictation } from './dictation-scorer';
import { fetchYouTubeSentences, isYouTubeHost, parseWebVtt } from './dictation-captions';

export interface DictationAnswer {
  sentenceId: string;
  textInput: string;
  hintCount?: number;
  usedTranscriptHint?: boolean;
}

export interface CreateCustomDictationInput {
  mediaUrl?: unknown;
  mediaType?: unknown;
  title?: unknown;
  level?: unknown;
  captionsVtt?: unknown;
  useYouTubeCaptions?: unknown;
}

@Injectable()
export class DictationService {
  constructor(private readonly dataSource: DataSource) {}

  async listLessons(userId?: string, filters: { level?: string; mediaType?: string; q?: string } = {}) {
    const candidate = userId ? await this.dataSource.getRepository(User).findOneBy({ id: userId }) : null;
    const user = candidate?.isActive ? candidate : null;
    const query = this.dataSource.getRepository(Lesson).createQueryBuilder('lesson')
      .leftJoin('lesson.sentences', 'sentence')
      .select(['lesson.id', 'lesson.title', 'lesson.level', 'lesson.audioUrl', 'lesson.mediaType', 'lesson.sourceName', 'lesson.sourceUrl', 'lesson.durationSeconds', 'lesson.isPremiumOnly', 'lesson.createdByUserId'])
      .addSelect('COUNT(sentence.id)', 'sentenceCount')
      .where('lesson.status = :status', { status: 'PUBLISHED' })
      .andWhere(filters.level ? 'lesson.level = :level' : '1 = 1', filters.level ? { level: filters.level } : {})
      .andWhere(filters.mediaType ? 'lesson.mediaType = :mediaType' : '1 = 1', filters.mediaType ? { mediaType: filters.mediaType } : {})
      .andWhere(filters.q ? 'LOWER(lesson.title) LIKE :query' : '1 = 1', filters.q ? { query: `%${filters.q.toLowerCase()}%` } : {})
      .groupBy('lesson.id')
      .orderBy('lesson.createdAt', 'DESC');
    if (user) query.andWhere('(lesson.createdByUserId IS NULL OR lesson.createdByUserId = :userId)', { userId: user.id });
    else query.andWhere('lesson.createdByUserId IS NULL');
    const rows = await query.getRawAndEntities();
    return { items: rows.entities.map((lesson, index) => ({
      id: lesson.id, title: lesson.title, level: lesson.level, audioUrl: lesson.audioUrl, durationSeconds: lesson.durationSeconds,
      mediaType: lesson.mediaType, sourceName: lesson.sourceName, sourceUrl: lesson.sourceUrl,
      isPremiumOnly: lesson.isPremiumOnly, sentenceCount: Number(rows.raw[index]?.sentenceCount ?? 0),
      access: (user && this.hasPremium(user)) || !lesson.isPremiumOnly ? 'AVAILABLE' : 'LOCKED',
      isCustom: Boolean(lesson.createdByUserId),
    })) };
  }

  async createCustomLesson(userId: string, input: CreateCustomDictationInput) {
    const user = await this.getUser(userId);
    const mediaUrl = typeof input.mediaUrl === 'string' ? input.mediaUrl.trim() : '';
    const mediaType = input.mediaType;
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const level = input.level ?? 'BEGINNER';
    const captionsVtt = typeof input.captionsVtt === 'string' ? input.captionsVtt : '';
    const useYouTubeCaptions = input.useYouTubeCaptions === true;
    if (!mediaUrl || mediaUrl.length > 500 || !['AUDIO', 'VIDEO', 'PODCAST'].includes(String(mediaType))) {
      throw new BadRequestException('Hãy nhập URL media và chọn đúng loại Audio, Video hoặc Podcast.');
    }
    if (title.length > 255 || !['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(String(level))) {
      throw new BadRequestException('Tên bài học hoặc trình độ không hợp lệ.');
    }
    const lessonLevel = String(level) as LessonLevel;
    const lessonMediaType = String(mediaType) as LessonMediaType;
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(mediaUrl);
      if (!['https:', 'http:'].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) throw new Error('invalid URL');
    } catch {
      throw new BadRequestException('URL media không hợp lệ.');
    }
    if (lessonMediaType === 'VIDEO' && !isYouTubeHost(parsedUrl.hostname)) {
      throw new BadRequestException('Nguồn Video phải là đường dẫn YouTube để phát trực tiếp trên website.');
    }
    if (useYouTubeCaptions && (lessonMediaType !== 'VIDEO' || !isYouTubeHost(parsedUrl.hostname))) {
      throw new BadRequestException('Tự lấy phụ đề chỉ dùng được với URL video YouTube.');
    }
    if (captionsVtt.length > 1_000_000) {
      throw new BadRequestException('Phụ đề WebVTT không được vượt quá 1 MB.');
    }
    if (!captionsVtt.trim() && !useYouTubeCaptions) {
      throw new BadRequestException('Hãy bật lấy phụ đề YouTube hoặc cung cấp phụ đề WebVTT có timestamp.');
    }

    const transcriptSentences = captionsVtt.trim()
      ? parseWebVtt(captionsVtt)
      : await fetchYouTubeSentences(mediaUrl);
    if (transcriptSentences.length > 1_000) throw new BadRequestException('Bài học có quá 1.000 câu phụ đề.');
    const orderIndices = new Set<number>();
    for (const sentence of transcriptSentences) {
      if (!Number.isInteger(sentence.orderIndex) || sentence.orderIndex < 1 || orderIndices.has(sentence.orderIndex) ||
        typeof sentence.text !== 'string' || !sentence.text.trim() || sentence.text.length > 2_000 ||
        !Number.isFinite(sentence.startTime) || !Number.isFinite(sentence.endTime) ||
        sentence.startTime < 0 || sentence.endTime <= sentence.startTime || sentence.endTime > 86_400) {
        throw new BadRequestException('Phụ đề trả về câu hoặc timestamp không hợp lệ.');
      }
      orderIndices.add(sentence.orderIndex);
    }

    const sourceName = parsedUrl.hostname.slice(0, 150);
    const lessonTitle = (title || parsedUrl.hostname).slice(0, 255);
    const durationSeconds = Math.ceil(Math.max(...transcriptSentences.map((sentence) => sentence.endTime)));
    const saved = await this.dataSource.transaction(async (manager) => {
      const lessonRepo = manager.getRepository(Lesson);
      const lesson = await lessonRepo.save(lessonRepo.create({
        title: lessonTitle, level: lessonLevel,
        audioUrl: mediaUrl, mediaType: lessonMediaType,
        sourceName, sourceUrl: mediaUrl,
        durationSeconds,
        createdByUserId: user.id, isPremiumOnly: false, status: 'PUBLISHED',
      }));
      const sentenceRepo = manager.getRepository(LessonSentence);
      const rows = transcriptSentences.map((sentence) => {
        const words = sentence.text.trim().split(/\s+/).filter(Boolean);
        if (words.length > 300) throw new BadRequestException('Một câu phụ đề vượt quá giới hạn 300 từ.');
        const step = (sentence.endTime - sentence.startTime) / Math.max(words.length, 1);
        return sentenceRepo.create({
          lessonId: lesson.id, orderIndex: sentence.orderIndex, startTime: sentence.startTime, endTime: sentence.endTime,
          textContent: sentence.text.trim(),
          wordsJson: words.map((word, index) => ({
            word: word.replace(/[.,!?;:]/g, ''),
            start: Number((sentence.startTime + index * step).toFixed(3)),
            end: Number((sentence.startTime + (index + 1) * step).toFixed(3)),
          })),
        });
      });
      await sentenceRepo.save(rows);
      return { lesson, sentenceCount: rows.length };
    });

    return { item: {
      id: saved.lesson.id, title: saved.lesson.title, level: saved.lesson.level,
      audioUrl: saved.lesson.audioUrl, mediaType: saved.lesson.mediaType,
      sourceName: saved.lesson.sourceName, sourceUrl: saved.lesson.sourceUrl,
      durationSeconds: saved.lesson.durationSeconds, isPremiumOnly: false,
      access: 'AVAILABLE', sentenceCount: saved.sentenceCount,
      isCustom: true,
    } };
  }

  async getLessonSentences(userId: string, lessonId: string) {
    const user = await this.getUser(userId);
    const lesson = await this.dataSource.getRepository(Lesson).createQueryBuilder('lesson')
      .where('lesson.id = :lessonId AND lesson.status = :status', { lessonId, status: 'PUBLISHED' })
      .andWhere('(lesson.createdByUserId IS NULL OR lesson.createdByUserId = :userId)', { userId })
      .getOne();
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học đã xuất bản.');
    this.assertLessonAccess(user, lesson);
    const sentences = await this.dataSource.getRepository(LessonSentence).find({
      where: { lessonId }, order: { orderIndex: 'ASC' },
    });
    const config = await this.dataSource.getRepository(SystemConfig).findOneBy({ key: 'dictation.hint_penalties' });
    const configuredPenalties = Array.isArray(config?.value) ? config.value.map(Number) : [];
    const hintPenalties = configuredPenalties.length === 4 && configuredPenalties.every((value) => Number.isFinite(value) && value >= 0 && value <= 100)
      ? configuredPenalties : [0, 5, 10, 20];
    return { lesson: { id: lesson.id, title: lesson.title, level: lesson.level, audioUrl: lesson.audioUrl, mediaType: lesson.mediaType, sourceName: lesson.sourceName, sourceUrl: lesson.sourceUrl }, sentences, hintPenalties };
  }

  async submit(userId: string, lessonId: string, answers?: DictationAnswer[]) {
    if (!Array.isArray(answers) || !answers.length || answers.length > 300) throw new BadRequestException('Danh sách câu trả lời không hợp lệ.');
    const isUuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    if (!isUuid(lessonId) || answers.some((answer) => !isUuid(answer?.sentenceId))) throw new BadRequestException('ID bài học hoặc câu không hợp lệ.');
    if (new Set(answers.map((answer) => answer.sentenceId)).size !== answers.length) throw new BadRequestException('Một câu không được gửi lặp trong cùng bài nộp.');
    for (const answer of answers) {
      if (typeof answer.textInput !== 'string' || answer.textInput.length > 5000) throw new BadRequestException('Câu trả lời tối đa 5.000 ký tự.');
      if (normalizeWords(answer.textInput).length > 300) throw new BadRequestException('Câu trả lời vượt quá 300 từ.');
    }

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).findOneBy({ id: userId });
      if (!user) throw new NotFoundException('Không tìm thấy tài khoản.');
      if (!user.isActive) throw new ForbiddenException('Tài khoản hiện không hoạt động.');
      const lesson = await manager.getRepository(Lesson).createQueryBuilder('lesson')
        .where('lesson.id = :lessonId AND lesson.status = :status', { lessonId, status: 'PUBLISHED' })
        .andWhere('(lesson.createdByUserId IS NULL OR lesson.createdByUserId = :userId)', { userId })
        .getOne();
      if (!lesson) throw new NotFoundException('Không tìm thấy bài học đã xuất bản.');
      this.assertLessonAccess(user, lesson);
      const sentenceIds = answers.map((item) => item.sentenceId);
      const lessonSentences = await manager.getRepository(LessonSentence).findBy({ lessonId });
      if (lessonSentences.length !== answers.length) throw new BadRequestException('Cần nộp câu trả lời cuối cùng cho toàn bộ bài học.');
      const sentences = await manager.getRepository(LessonSentence).findBy(sentenceIds.map((id) => ({ id, lessonId })));
      if (sentences.length !== answers.length) throw new BadRequestException('Có câu không thuộc bài học này.');
      const configRow = await manager.createQueryBuilder().select('config.value', 'value').from('system_configs', 'config')
        .where('config.key = :key', { key: 'dictation.hint_penalties' }).getRawOne<{ value: unknown }>();
      const configValue = typeof configRow?.value === 'string' ? JSON.parse(configRow.value) : configRow?.value;
      const byId = new Map(sentences.map((item) => [item.id, item]));
      
      const results: Array<{ attemptId: string; sentenceId: string; accuracyScore: number; wer: number; diff: any }> = [];

      for (const answer of answers) {
        const sentence = byId.get(answer.sentenceId)!;
        if (normalizeWords(sentence.textContent).length > 300) throw new BadRequestException('Transcript câu vượt giới hạn chấm điểm.');
        const penalty = hintPenalty(Number(answer.hintCount ?? 0), configValue);
        const result = scoreDictation(sentence.textContent, answer.textInput, penalty);
        const attempt = await manager.getRepository(UserAttempt).save(manager.getRepository(UserAttempt).create({
          userId, sentenceId: sentence.id, textInput: answer.textInput, type: 'DICTATION', status: 'COMPLETED',
          usedTranscriptHint: Boolean(answer.usedTranscriptHint), audioUrl: null,
        }));
        await manager.getRepository(Score).save(manager.getRepository(Score).create({
          attemptId: attempt.id, overallScore: result.accuracy, accuracyScore: result.accuracy,
          fluencyScore: null, completenessScore: null, wordsScoreDetail: result.words,
        }));

        for (const weakWord of result.reviewWords) {
          if (!weakWord) continue;
          const wordResult = result.words.find((item) => item.word === weakWord && item.error_type !== 'None');
          await manager.query(
            `INSERT INTO review_lists (id, user_id, weak_word, wrong_count, priority_score, added_at, source_type, accuracy_score, error_type, last_attempt_id)
             VALUES (gen_random_uuid(), $1, $2, 1, 1, NOW(), 'DICTATION', $3, $4, $5)
             ON CONFLICT (user_id, weak_word) DO UPDATE
             SET wrong_count = review_lists.wrong_count + 1,
                 priority_score = review_lists.priority_score * EXP(-EXTRACT(EPOCH FROM (NOW() - review_lists.added_at)) / 2592000) + 1,
                 source_type = EXCLUDED.source_type,
                 accuracy_score = EXCLUDED.accuracy_score,
                 error_type = EXCLUDED.error_type,
                 last_attempt_id = EXCLUDED.last_attempt_id,
                 correct_streak = 0,
                 added_at = NOW()`,
            [userId, weakWord.slice(0, 100), wordResult?.accuracy_score ?? 0, wordResult?.error_type ?? 'Omission', attempt.id],
          );
        }
        results.push({ attemptId: attempt.id, sentenceId: sentence.id, accuracyScore: result.accuracy, wer: result.wer, diff: result.diff });
      }

      await this.recordStreak(manager, userId);
      return { lessonId, results, overallScore: Math.round(results.reduce((sum, item) => sum + item.accuracyScore, 0) / results.length) };
    });
  }

  async getHistory(userId: string) {
    const attempts = await this.dataSource.getRepository(UserAttempt).createQueryBuilder('attempt')
      .innerJoinAndSelect('attempt.sentence', 'sentence')
      .innerJoinAndSelect('sentence.lesson', 'lesson')
      .innerJoinAndSelect('attempt.score', 'score')
      .where('attempt.userId = :userId AND attempt.type = :type AND attempt.status = :status AND attempt.isDiscarded = false', {
        userId, type: 'DICTATION', status: 'COMPLETED',
      })
      .orderBy('attempt.createdAt', 'DESC')
      .take(100)
      .getMany();

    return {
      items: attempts.map((attempt) => ({
        attemptId: attempt.id,
        createdAt: attempt.createdAt,
        lessonId: attempt.sentence.lessonId,
        lessonTitle: attempt.sentence.lesson.title,
        sentenceId: attempt.sentenceId,
        sentenceText: attempt.sentence.textContent,
        submittedText: attempt.textInput,
        result: attempt.score ? {
          overall_score: attempt.score.overallScore,
          accuracy_score: attempt.score.accuracyScore,
          words_score_detail: attempt.score.wordsScoreDetail,
        } : null,
      })),
    };
  }

  private async getUser(userId: string) {
    const user = await this.dataSource.getRepository(User).findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản.');
    if (!user.isActive) throw new ForbiddenException('Tài khoản hiện không hoạt động.');
    return user;
  }

  private hasPremium(user: User | null): boolean {
    if (!user) return false;
    return user.role === UserRole.ADMIN || (user.role === UserRole.PREMIUM_STUDENT && !!user.premiumExpiredAt && user.premiumExpiredAt > new Date());
  }

  private assertLessonAccess(user: User, lesson: Lesson) {
    if (lesson.isPremiumOnly && !this.hasPremium(user)) {
      throw new ForbiddenException({ statusCode: 403, error_code: 'FORBIDDEN_PREMIUM_REQUIRED', message: 'Bài học này yêu cầu tài khoản Premium.' });
    }
  }

  private async recordStreak(manager: EntityManager, userId: string) {
    const inserted = await manager.query(
      `INSERT INTO streak_logs (id, user_id, study_date)
       VALUES (gen_random_uuid(), $1, CURRENT_DATE)
       ON CONFLICT (user_id, study_date) DO NOTHING
       RETURNING id`, [userId],
    );
    if (!inserted.length) {
      await manager.query(
        'UPDATE streak_logs SET daily_points = daily_points + 1 WHERE user_id = $1 AND study_date = CURRENT_DATE',
        [userId],
      );
      return;
    }
    await manager.query(
      'UPDATE streak_logs SET daily_points = 1 WHERE user_id = $1 AND study_date = CURRENT_DATE',
      [userId],
    );
    const yesterday: Array<{ exists: boolean }> = await manager.query(
      `SELECT EXISTS (SELECT 1 FROM streak_logs WHERE user_id = $1 AND study_date = CURRENT_DATE - 1) AS exists`, [userId],
    );
    await manager.getRepository(User).update(userId, { streakCount: yesterday[0].exists ? () => 'streak_count + 1' : 1 });
  }
}

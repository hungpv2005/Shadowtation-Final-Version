import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import * as path from 'path';
import { DataSource, EntityManager } from 'typeorm';
import { LessonSentence } from '../../database/entities/lesson-sentence.entity';
import { Score, WordScore } from '../../database/entities/score.entity';
import { SystemConfig } from '../../database/entities/system-config.entity';
import { User, UserRole } from '../../database/entities/user.entity';
import { UserAttempt } from '../../database/entities/user-attempt.entity';
import { AssessmentResult, SpeechService, WordScoreDetail } from '../../speech/speech.service';

type ScoredWord = WordScore & { color: 'GREEN' | 'YELLOW' | 'RED' };
type AssessmentConfig = { weights: { accuracy: number; fluency: number; completeness: number }; green: number; yellow: number };
type S3StorageConfig = { baseUrl: URL; bucket: string; accessKey: string; secretKey: string; region: string };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class ShadowingService implements OnModuleInit {
  private readonly logger = new Logger(ShadowingService.name);
  private readonly audioDirectory: string;
  private readonly running = new Set<string>();
  private readonly queuedIds = new Set<string>();
  private readonly pendingQueue: string[] = [];
  private activeWorkers = 0;
  private bucketReady = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly speechService: SpeechService,
    private readonly config: ConfigService,
  ) {
    this.audioDirectory = path.resolve(config.get<string>('SHADOWING_AUDIO_DIR')?.trim() || path.join(process.cwd(), 'uploads', 'shadowing'));
  }

  onModuleInit() {
    // Pending rows are the durable local queue. Recover them after an API restart.
    void (async () => {
      await this.dataSource.getRepository(UserAttempt).update(
        { type: 'SHADOWING', status: 'PROCESSING', isDiscarded: false }, { status: 'PENDING' },
      );
      const attempts = await this.dataSource.getRepository(UserAttempt).find({
        where: { type: 'SHADOWING', status: 'PENDING', isDiscarded: false },
        select: { id: true },
      });
      attempts.forEach(({ id }) => this.enqueue(id));
    })().catch((error) => {
      this.logger.error(`Could not recover pending Shadowing attempts: ${String(error)}`);
    });
  }

  async submit(userId: string, sentenceId: unknown, file: Express.Multer.File) {
    if (typeof sentenceId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sentenceId)) {
      throw new BadRequestException('ID câu luyện tập không hợp lệ.');
    }
    if (!file.buffer?.length || file.size > 5 * 1024 * 1024) throw new BadRequestException('Tệp ghi âm phải có dung lượng tối đa 5 MB.');

    const sentence = await this.dataSource.getRepository(LessonSentence).createQueryBuilder('sentence')
      .innerJoinAndSelect('sentence.lesson', 'lesson')
      .where('sentence.id = :sentenceId AND lesson.status = :status', { sentenceId, status: 'PUBLISHED' })
      .andWhere('(lesson.createdByUserId IS NULL OR lesson.createdByUserId = :userId)', { userId })
      .getOne();
    if (!sentence?.lesson) throw new NotFoundException('Không tìm thấy câu trong bài học đã xuất bản.');

    const user = await this.dataSource.getRepository(User).findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản.');
    if (!user.isActive) throw new ForbiddenException('Tài khoản hiện không hoạt động.');
    if (sentence.lesson.isPremiumOnly && !this.hasPremium(user)) {
      throw new ForbiddenException({ statusCode: 403, error_code: 'FORBIDDEN_PREMIUM_REQUIRED', message: 'Bài học này yêu cầu tài khoản Premium.' });
    }

    const extension = this.fileExtension(file.mimetype);
    const storageKey = `${randomUUID()}.${extension}`;
    const audioUrl = await this.saveAudio(storageKey, file.buffer, file.mimetype);

    try {
      const attempt = await this.dataSource.getRepository(UserAttempt).save(this.dataSource.getRepository(UserAttempt).create({
        userId,
        sentenceId: sentence.id,
        audioUrl,
        textInput: null,
        type: 'SHADOWING',
        status: 'PENDING',
        errorCode: null,
        isDiscarded: false,
        usedTranscriptHint: false,
      }));
      this.enqueue(attempt.id);
      return { attempt_id: attempt.id, status: attempt.status };
    } catch (error) {
      await this.deleteAudio(audioUrl).catch(() => undefined);
      throw error;
    }
  }

  async getStatus(userId: string, attemptId: string) {
    const attempt = await this.dataSource.getRepository(UserAttempt).createQueryBuilder('attempt')
      .leftJoinAndSelect('attempt.score', 'score')
      .where('attempt.id = :attemptId AND attempt.userId = :userId AND attempt.type = :type', { attemptId, userId, type: 'SHADOWING' })
      .getOne();
    if (!attempt || attempt.isDiscarded) throw new NotFoundException('Không tìm thấy lượt luyện Shadowing.');
    return {
      attemptId: attempt.id,
      status: attempt.status,
      errorCode: attempt.errorCode,
      result: attempt.score ? {
        overall_score: attempt.score.overallScore,
        assessment_source: attempt.score.assessmentSource,
        accuracy_score: attempt.score.accuracyScore,
        fluency_score: attempt.score.fluencyScore ?? 0,
        completeness_score: attempt.score.completenessScore ?? 0,
        words_score_detail: attempt.score.wordsScoreDetail,
      } : null,
    };
  }

  async getHistory(userId: string) {
    const attempts = await this.dataSource.getRepository(UserAttempt).createQueryBuilder('attempt')
      .innerJoinAndSelect('attempt.sentence', 'sentence')
      .innerJoinAndSelect('sentence.lesson', 'lesson')
      .innerJoinAndSelect('attempt.score', 'score')
      .where('attempt.userId = :userId AND attempt.type = :type AND attempt.status = :status AND attempt.isDiscarded = false', {
        userId, type: 'SHADOWING', status: 'COMPLETED',
      })
      .orderBy('attempt.createdAt', 'DESC')
      .take(50)
      .getMany();

    return {
      items: attempts.map((attempt) => ({
        attemptId: attempt.id,
        createdAt: attempt.createdAt,
        lessonId: attempt.sentence.lessonId,
        lessonTitle: attempt.sentence.lesson.title,
        sentenceId: attempt.sentenceId,
        sentenceText: attempt.sentence.textContent,
        result: attempt.score ? {
          overall_score: attempt.score.overallScore,
          assessment_source: attempt.score.assessmentSource,
          accuracy_score: attempt.score.accuracyScore,
          fluency_score: attempt.score.fluencyScore ?? 0,
          completeness_score: attempt.score.completenessScore ?? 0,
          words_score_detail: attempt.score.wordsScoreDetail,
        } : null,
      })),
    };
  }

  async discard(userId: string, attemptId: string) {
    const attempt = await this.dataSource.getRepository(UserAttempt).findOneBy({ id: attemptId, userId, type: 'SHADOWING' });
    if (!attempt) throw new NotFoundException('Không tìm thấy lượt luyện Shadowing.');
    if (attempt.isDiscarded) return { attemptId, discarded: true };
    if (attempt.status === 'PENDING' || attempt.status === 'PROCESSING') {
      throw new BadRequestException('Đang chấm điểm lượt này. Hãy đợi kết quả rồi thử lại.');
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(UserAttempt).update({ id: attemptId, userId }, { isDiscarded: true });
      await manager.getRepository(Score).delete({ attemptId });
    });
    return { attemptId, discarded: true };
  }

  private enqueue(attemptId: string) {
    if (this.running.has(attemptId) || this.queuedIds.has(attemptId)) return;
    this.queuedIds.add(attemptId);
    this.pendingQueue.push(attemptId);
    this.drainQueue();
  }

  private drainQueue() {
    while (this.activeWorkers < 2 && this.pendingQueue.length) {
      const attemptId = this.pendingQueue.shift()!;
      this.queuedIds.delete(attemptId);
      this.running.add(attemptId);
      this.activeWorkers += 1;
      setImmediate(() => void this.processAttempt(attemptId).catch((error) => {
        this.logger.error(`Shadowing worker failed for ${attemptId}: ${String(error)}`);
        return this.fail(attemptId, 'AI_SERVICE_ERROR');
      }).finally(() => {
        this.running.delete(attemptId);
        this.activeWorkers -= 1;
        this.drainQueue();
      }));
    }
  }

  private async processAttempt(attemptId: string) {
    const claimed = await this.dataSource.createQueryBuilder().update(UserAttempt)
      .set({ status: 'PROCESSING', errorCode: null })
      .where('id = :attemptId AND type = :type AND status = :status AND is_discarded = false', {
        attemptId, type: 'SHADOWING', status: 'PENDING',
      }).execute();
    if (!claimed.affected) return;

    const attempt = await this.dataSource.getRepository(UserAttempt).createQueryBuilder('attempt')
      .innerJoinAndSelect('attempt.sentence', 'sentence')
      .where('attempt.id = :attemptId', { attemptId })
      .getOne();
    if (!attempt?.audioUrl) return this.fail(attemptId, 'INVALID_AUDIO_FORMAT');

    let assessment: AssessmentResult | null = null;
    let finalCode = 'AI_SERVICE_ERROR';
    for (let retry = 0; retry <= 3; retry += 1) {
      try {
        const buffer = await this.loadAudio(attempt.audioUrl);
        const audioFileName = attempt.audioUrl.split('/').pop() || 'recording.webm';
        assessment = await this.speechService.assessPronunciation(buffer, attempt.sentence.textContent, audioFileName);
        break;
      } catch (error) {
        const response = error instanceof HttpException ? error.getResponse() : null;
        const message = `${error instanceof Error ? error.message : ''} ${typeof response === 'string' ? response : JSON.stringify(response ?? '')}`.toLowerCase();
        finalCode = message.includes('timeout') || message.includes('timed out') ? 'AI_TIMEOUT'
          : message.includes('openai_api_key') || message.includes('openai authentication') || message.includes('unauthorized') || message.includes('forbidden') || message.includes('invalid api key') ? 'AI_CONFIGURATION_ERROR'
            : message.includes('định dạng') || message.includes('audio') && (message.includes('từ chối') || message.includes('rejected')) || message.includes('unsupported') ? 'INVALID_AUDIO_FORMAT'
            : 'AI_SERVICE_ERROR';
        this.logger.warn(`Shadowing assessment attempt ${attemptId} failed (${finalCode}): ${message.slice(0, 500)}`);
        if (finalCode === 'INVALID_AUDIO_FORMAT' || finalCode === 'AI_CONFIGURATION_ERROR') break;
        if (retry < 3) await sleep(2 ** (retry + 1) * 1000);
      }
    }
    if (!assessment) return this.fail(attemptId, finalCode);

    try {
      const config = await this.readAssessmentConfig();
      const words = this.alignWords(attempt.sentence.textContent, assessment.words_score_detail, config);
      const overall = assessment.source === 'MOCK'
        ? assessment.overall_score
        : Math.round(assessment.accuracy_score * config.weights.accuracy
          + assessment.fluency_score * config.weights.fluency
          + assessment.completeness_score * config.weights.completeness);
      await this.dataSource.transaction(async (manager) => {
        const current = await manager.getRepository(UserAttempt).findOneBy({ id: attemptId });
        if (!current || current.isDiscarded) return;
        await manager.getRepository(Score).save(manager.getRepository(Score).create({
          attemptId,
          overallScore: Math.max(0, Math.min(100, overall)),
          assessmentSource: assessment!.source,
          accuracyScore: Math.max(0, Math.min(100, assessment!.accuracy_score)),
          fluencyScore: Math.max(0, Math.min(100, assessment!.fluency_score)),
          completenessScore: Math.max(0, Math.min(100, assessment!.completeness_score)),
          wordsScoreDetail: words,
        }));
        await manager.getRepository(UserAttempt).update(attemptId, { status: 'COMPLETED', errorCode: null });
        await this.upsertReviewWords(manager, current.userId, attemptId, words);
        await this.recordStreak(manager, current.userId);
      });
    } catch (error) {
      this.logger.error(`Could not save Shadowing result ${attemptId}: ${String(error)}`);
      await this.fail(attemptId, 'AI_SERVICE_ERROR');
    }
  }

  private async fail(attemptId: string, errorCode: string) {
    await this.dataSource.getRepository(UserAttempt).update({ id: attemptId, isDiscarded: false }, { status: 'FAILED', errorCode });
  }

  private async readAssessmentConfig(): Promise<AssessmentConfig> {
    const configs = await this.dataSource.getRepository(SystemConfig).findBy([
      { key: 'shadowing.score_weights' }, { key: 'shadowing.score_thresholds' },
    ]);
    const weightValue = configs.find((item) => item.key === 'shadowing.score_weights')?.value as Record<string, unknown> | undefined;
    const thresholdValue = configs.find((item) => item.key === 'shadowing.score_thresholds')?.value as Record<string, unknown> | undefined;
    const rawWeights = {
      accuracy: Number(weightValue?.accuracy ?? 0.5),
      fluency: Number(weightValue?.fluency ?? 0.25),
      completeness: Number(weightValue?.completeness ?? 0.25),
    };
    const totalWeight = rawWeights.accuracy + rawWeights.fluency + rawWeights.completeness;
    const validWeights = Object.values(rawWeights).every((value) => Number.isFinite(value) && value >= 0);
    const weights = validWeights && Number.isFinite(totalWeight) && totalWeight > 0
      ? { accuracy: rawWeights.accuracy / totalWeight, fluency: rawWeights.fluency / totalWeight, completeness: rawWeights.completeness / totalWeight }
      : { accuracy: 0.5, fluency: 0.25, completeness: 0.25 };
    const green = Number(thresholdValue?.green ?? 80);
    const yellow = Number(thresholdValue?.yellow ?? 50);
    const safeGreen = Number.isFinite(green) ? Math.max(50, Math.min(100, green)) : 80;
    const safeYellow = Number.isFinite(yellow) ? Math.max(0, Math.min(safeGreen - 1, yellow)) : 50;
    return {
      weights,
      green: safeGreen,
      yellow: safeYellow,
    };
  }

  private alignWords(referenceText: string, recognized: WordScoreDetail[], config: AssessmentConfig): ScoredWord[] {
    const reference = referenceText.trim().split(/\s+/).filter(Boolean);
    const heard = recognized ?? [];
    const normalize = (word: string) => word.toLocaleLowerCase().replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '');
    const rows = reference.length + 1;
    const cols = heard.length + 1;
    const costs = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
    for (let i = 0; i < rows; i += 1) costs[i][0] = i;
    for (let j = 0; j < cols; j += 1) costs[0][j] = j;
    for (let i = 1; i < rows; i += 1) for (let j = 1; j < cols; j += 1) {
      const substitution = costs[i - 1][j - 1] + (normalize(reference[i - 1]) === normalize(heard[j - 1].word) ? 0 : 1);
      costs[i][j] = Math.min(substitution, costs[i - 1][j] + 1, costs[i][j - 1] + 1);
    }

    const aligned: ScoredWord[] = [];
    let i = reference.length;
    let j = heard.length;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0) {
        const same = normalize(reference[i - 1]) === normalize(heard[j - 1].word);
        if (costs[i][j] === costs[i - 1][j - 1] + (same ? 0 : 1)) {
          const item = heard[j - 1];
          const color = this.color(item.accuracy_score, item.error_type, config);
          aligned.unshift({ word: reference[i - 1], accuracy_score: item.accuracy_score, error_type: same ? item.error_type : 'Mispronunciation', color });
          i -= 1; j -= 1; continue;
        }
      }
      if (i > 0 && costs[i][j] === costs[i - 1][j] + 1) {
        aligned.unshift({ word: reference[i - 1], accuracy_score: 0, error_type: 'Omission', color: 'RED' });
        i -= 1; continue;
      }
      const item = heard[j - 1];
      aligned.unshift({ word: item.word, accuracy_score: item.accuracy_score, error_type: 'Insertion', color: 'RED' });
      j -= 1;
    }
    return aligned;
  }

  private color(score: number, errorType: string, config: AssessmentConfig): ScoredWord['color'] {
    if (errorType === 'Omission' || errorType === 'Insertion' || score < config.yellow) return 'RED';
    if (score < config.green) return 'YELLOW';
    return 'GREEN';
  }

  private async upsertReviewWords(manager: EntityManager, userId: string, attemptId: string, words: ScoredWord[]) {
    const weakWords = new Map<string, ScoredWord>();
    for (const item of words.filter((word) => word.color !== 'GREEN')) {
      const word = item.word.toLocaleLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
      if (word && !weakWords.has(word)) weakWords.set(word, item);
    }
    for (const [word, result] of weakWords) {
      await manager.query(
        `INSERT INTO review_lists (id, user_id, weak_word, wrong_count, priority_score, added_at, source_type, accuracy_score, error_type, last_attempt_id)
         VALUES (gen_random_uuid(), $1, $2, 1, 1, NOW(), 'SHADOWING', $3, $4, $5)
         ON CONFLICT (user_id, weak_word) DO UPDATE SET
           wrong_count = review_lists.wrong_count + 1,
           priority_score = review_lists.priority_score * EXP(-EXTRACT(EPOCH FROM (NOW() - review_lists.added_at)) / 2592000) + 1,
           added_at = NOW(),
           source_type = EXCLUDED.source_type,
           accuracy_score = EXCLUDED.accuracy_score,
           error_type = EXCLUDED.error_type,
           last_attempt_id = EXCLUDED.last_attempt_id,
           correct_streak = 0`,
        [userId, word, result.accuracy_score, result.error_type, attemptId],
      );
    }
  }

  private async recordStreak(manager: EntityManager, userId: string) {
    const inserted = await manager.query(
      `INSERT INTO streak_logs (id, user_id, study_date) VALUES (gen_random_uuid(), $1, CURRENT_DATE)
       ON CONFLICT (user_id, study_date) DO NOTHING RETURNING id`, [userId],
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

  private hasPremium(user: User) {
    return user.role === UserRole.ADMIN || (user.role === UserRole.PREMIUM_STUDENT && !!user.premiumExpiredAt && user.premiumExpiredAt > new Date());
  }

  private fileExtension(mimeType: string) {
    const extensions: Record<string, string> = {
      'audio/webm': 'webm', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
      'audio/mpga': 'mpga', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/m4a': 'm4a', 'audio/flac': 'flac',
    };
    const extension = extensions[mimeType.split(';')[0].trim().toLowerCase()];
    if (!extension) throw new BadRequestException('Định dạng tệp ghi âm không được hỗ trợ.');
    return extension;
  }

  private async saveAudio(fileName: string, buffer: Buffer, contentType: string) {
    const storage = this.s3Storage();
    const key = `shadowing/${fileName}`;
    if (storage) {
      await this.ensureBucket(storage);
      await this.s3Request(storage, 'PUT', key, buffer, contentType.split(';')[0].trim().toLowerCase());
      return `s3://${storage.bucket}/${key}`;
    }
    await mkdir(this.audioDirectory, { recursive: true });
    await writeFile(path.join(this.audioDirectory, fileName), buffer, { flag: 'wx' });
    return key;
  }

  private async loadAudio(audioUrl: string) {
    const storage = this.s3Storage();
    if (audioUrl.startsWith('s3://')) {
      const [, , bucket, ...keyParts] = audioUrl.split('/');
      if (!storage || bucket !== storage.bucket || !keyParts.length) throw new Error('Audio object storage is not configured.');
      const response = await this.s3Request(storage, 'GET', keyParts.join('/'));
      if (!response.ok) throw new Error(`Audio object was not found in S3 (${response.status}).`);
      return Buffer.from(await response.arrayBuffer());
    }
    return readFile(path.join(this.audioDirectory, path.basename(audioUrl)));
  }

  private async deleteAudio(audioUrl: string) {
    if (audioUrl.startsWith('s3://')) {
      const storage = this.s3Storage();
      const [, , bucket, ...keyParts] = audioUrl.split('/');
      if (storage && bucket === storage.bucket && keyParts.length) await this.s3Request(storage, 'DELETE', keyParts.join('/')).catch(() => undefined);
      return;
    }
    await unlink(path.join(this.audioDirectory, path.basename(audioUrl))).catch(() => undefined);
  }

  private s3Storage(): S3StorageConfig | null {
    const endpoint = this.config.get<string>('S3_ENDPOINT')?.trim();
    const bucket = this.config.get<string>('S3_BUCKET')?.trim();
    const accessKey = (this.config.get<string>('S3_ACCESS_KEY_ID') ?? this.config.get<string>('S3_ACCESS_KEY'))?.trim();
    const secretKey = (this.config.get<string>('S3_SECRET_ACCESS_KEY') ?? this.config.get<string>('S3_SECRET_KEY'))?.trim();
    if (!endpoint && !bucket && !accessKey && !secretKey) return null;
    if (!endpoint || !bucket || !accessKey || !secretKey) throw new Error('S3 audio storage requires S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY (or S3_ACCESS_KEY_ID), and S3_SECRET_KEY (or S3_SECRET_ACCESS_KEY).');
    const region = this.config.get<string>('S3_REGION')?.trim() || 'us-east-1';
    const baseUrl = new URL(endpoint);
    if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) throw new Error('S3_ENDPOINT must be a valid HTTP(S) URL.');
    return { baseUrl, bucket, accessKey, secretKey, region };
  }

  private async ensureBucket(storage: S3StorageConfig) {
    if (this.bucketReady) return;
    const check = await this.s3Request(storage, 'HEAD', '');
    if (check.status === 404) {
      const bucketConfig = storage.region === 'us-east-1' ? Buffer.alloc(0) : Buffer.from(
        `<CreateBucketConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><LocationConstraint>${storage.region}</LocationConstraint></CreateBucketConfiguration>`,
      );
      const created = await this.s3Request(storage, 'PUT', '', bucketConfig, bucketConfig.length ? 'application/xml' : undefined);
      if (!created.ok && created.status !== 409) throw new Error(`S3 bucket creation failed (${created.status}).`);
    } else if (!check.ok) throw new Error(`S3 bucket check failed (${check.status}).`);
    this.bucketReady = true;
  }

  private async s3Request(
    storage: S3StorageConfig,
    method: string,
    key: string,
    body?: Buffer,
    contentType?: string,
  ) {
    const basePath = storage.baseUrl.pathname.replace(/\/$/, '');
    const encodedKey = key.split('/').filter(Boolean).map(encodeURIComponent).join('/');
    const url = new URL(`${basePath}/${encodeURIComponent(storage.bucket)}${encodedKey ? `/${encodedKey}` : ''}`, storage.baseUrl.origin);
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = createHash('sha256').update(body ?? Buffer.alloc(0)).digest('hex');
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalHeaders = `host:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const canonicalRequest = `${method}\n${url.pathname}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const scope = `${dateStamp}/${storage.region}/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${createHash('sha256').update(canonicalRequest).digest('hex')}`;
    const sign = (keyBuffer: Buffer | string, value: string) => createHmac('sha256', keyBuffer).update(value).digest();
    const dateKey = sign(`AWS4${storage.secretKey}`, dateStamp);
    const regionKey = sign(dateKey, storage.region);
    const serviceKey = sign(regionKey, 's3');
    const signingKey = sign(serviceKey, 'aws4_request');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const headers: Record<string, string> = {
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      Authorization: `AWS4-HMAC-SHA256 Credential=${storage.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    };
    if (contentType && method === 'PUT' && key) headers['Content-Type'] = contentType;
    const response = await fetch(url, {
      method,
      headers,
      ...(body ? { body: body as unknown as BodyInit } : {}),
    });
    const bucketAlreadyExists = method === 'PUT' && !key && response.status === 409;
    if (!response.ok && response.status !== 404 && !(method === 'DELETE' && response.status === 404) && !bucketAlreadyExists) {
      const detail = await response.text().catch(() => '');
      throw new Error(`S3 ${method} failed (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ''}.`);
    }
    return response;
  }
}

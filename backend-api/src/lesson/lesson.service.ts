import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Lesson, LessonLevel, LessonStatus } from '../database/entities/lesson.entity';
import { LessonSentence, WordTiming } from '../database/entities/lesson-sentence.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateSentenceDto, UpdateSentenceDto } from './dto/create-sentence.dto';
import { fetchYouTubeSentences, isYouTubeHost, parseWebVtt } from '../practice/dictation/dictation-captions';
import { SpeechService } from '../speech/speech.service';

const SAMPLE_AUDIO_TRANSCRIPTS: Record<
  string,
  Array<{ orderIndex: number; startTime: number; endTime: number; text: string }>
> = {
  'daily-conversation-01': [
    { orderIndex: 1, startTime: 0.0, endTime: 2.14, text: 'Hello, how are you doing today?' },
    { orderIndex: 2, startTime: 2.39, endTime: 5.12, text: "I'm doing well, thank you for asking." },
    { orderIndex: 3, startTime: 5.37, endTime: 8.86, text: 'Are you ready to practice English listening and speaking?' },
  ],
  'at-the-coffee-shop': [
    { orderIndex: 1, startTime: 0.0, endTime: 2.5, text: 'Good morning! What can I get started for you today?' },
    { orderIndex: 2, startTime: 2.75, endTime: 5.92, text: 'Could I please have a large iced latte with oat milk?' },
    { orderIndex: 3, startTime: 6.17, endTime: 9.04, text: 'Sure thing, would you like any extra syrup or whipped cream?' },
  ],
  'technology-and-daily-life': [
    { orderIndex: 1, startTime: 0.0, endTime: 2.66, text: 'Technology is changing the way we live and work.' },
    { orderIndex: 2, startTime: 2.91, endTime: 6.05, text: 'Many people now study English with online tools.' },
    { orderIndex: 3, startTime: 6.3, endTime: 9.22, text: 'Practice every day and you will improve quickly.' },
  ],
};

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(LessonSentence)
    private readonly sentenceRepository: Repository<LessonSentence>,
    private readonly speechService: SpeechService,
  ) {}

  /**
   * Tự động tính toán phân bố thời gian từng từ nếu chưa có dữ liệu chi tiết
   */
  private buildWordsLinear(text: string, start: number, end: number): WordTiming[] {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    const duration = Math.max(0.1, end - start);
    const step = duration / words.length;
    return words.map((w, i) => ({
      word: w.replace(/[.,!?;:"'()]/g, ''),
      start: Number((start + i * step).toFixed(2)),
      end: Number((start + (i + 1) * step).toFixed(2)),
    }));
  }

  /**
   * Admin lấy toàn bộ danh sách bài học (kèm số câu và bộ lọc)
   */
  async findAllAdmin(query: {
    level?: LessonLevel;
    status?: LessonStatus;
    isPremiumOnly?: boolean;
    q?: string;
  }) {
    const qb = this.lessonRepository
      .createQueryBuilder('lesson')
      .leftJoin('lesson.sentences', 'sentence')
      .select([
        'lesson.id',
        'lesson.title',
        'lesson.level',
        'lesson.audioUrl',
        'lesson.mediaType',
        'lesson.sourceName',
        'lesson.sourceUrl',
        'lesson.durationSeconds',
        'lesson.isPremiumOnly',
        'lesson.status',
        'lesson.createdAt',
      ])
      .addSelect('COUNT(sentence.id)', 'sentenceCount');

    if (query.level) {
      qb.andWhere('lesson.level = :level', { level: query.level });
    }
    if (query.status) {
      qb.andWhere('lesson.status = :status', { status: query.status });
    }
    if (query.isPremiumOnly !== undefined) {
      qb.andWhere('lesson.isPremiumOnly = :isPremiumOnly', { isPremiumOnly: query.isPremiumOnly });
    }
    if (query.q) {
      qb.andWhere('LOWER(lesson.title) LIKE :q', { q: `%${query.q.toLowerCase()}%` });
    }

    qb.groupBy('lesson.id').orderBy('lesson.createdAt', 'DESC');

    const rawAndEntities = await qb.getRawAndEntities();

    return rawAndEntities.entities.map((lesson, index) => ({
      ...lesson,
      sentenceCount: Number(rawAndEntities.raw[index]?.sentenceCount ?? 0),
    }));
  }

  /**
   * Lấy chi tiết một bài học kèm toàn bộ danh sách câu
   */
  async findByIdWithSentences(id: string): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['sentences'],
      order: {
        sentences: {
          orderIndex: 'ASC',
          startTime: 'ASC',
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${id}`);
    }

    return lesson;
  }

  /**
   * Admin tạo mới bài học (có thể đính kèm danh sách câu ngay)
   */
  async createLesson(dto: CreateLessonDto, adminUserId?: string): Promise<Lesson> {
    const lesson = this.lessonRepository.create({
      title: dto.title.trim(),
      level: dto.level,
      audioUrl: dto.audioUrl.trim(),
      mediaType: dto.mediaType ?? 'AUDIO',
      sourceName: dto.sourceName?.trim() || null,
      sourceUrl: dto.sourceUrl?.trim() || null,
      durationSeconds: dto.durationSeconds ?? null,
      isPremiumOnly: dto.isPremiumOnly ?? false,
      status: dto.status ?? 'DRAFT',
      createdByUserId: adminUserId || null,
    });

    const savedLesson = await this.lessonRepository.save(lesson);

    // Nếu có danh sách câu gửi kèm
    if (dto.sentences && dto.sentences.length > 0) {
      const sentenceEntities = dto.sentences.map((s, index) => {
        const wordsJson =
          s.wordsJson && s.wordsJson.length > 0
            ? s.wordsJson
            : this.buildWordsLinear(s.textContent, s.startTime, s.endTime);

        return this.sentenceRepository.create({
          lessonId: savedLesson.id,
          orderIndex: s.orderIndex !== undefined ? s.orderIndex : index,
          startTime: s.startTime,
          endTime: s.endTime,
          textContent: s.textContent.trim(),
          wordsJson,
        });
      });

      await this.sentenceRepository.save(sentenceEntities);
    }

    return this.findByIdWithSentences(savedLesson.id);
  }

  /**
   * Admin cập nhật thông tin bài học (tiêu đề, cờ premium, trạng thái, ...)
   */
  async updateLesson(id: string, dto: UpdateLessonDto): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${id}`);
    }

    if (dto.title !== undefined) lesson.title = dto.title.trim();
    if (dto.level !== undefined) lesson.level = dto.level;
    if (dto.audioUrl !== undefined) lesson.audioUrl = dto.audioUrl.trim();
    if (dto.mediaType !== undefined) lesson.mediaType = dto.mediaType;
    if (dto.sourceName !== undefined) lesson.sourceName = dto.sourceName ? dto.sourceName.trim() : null;
    if (dto.sourceUrl !== undefined) lesson.sourceUrl = dto.sourceUrl ? dto.sourceUrl.trim() : null;
    if (dto.durationSeconds !== undefined) lesson.durationSeconds = dto.durationSeconds;
    if (dto.isPremiumOnly !== undefined) lesson.isPremiumOnly = dto.isPremiumOnly;
    if (dto.status !== undefined) lesson.status = dto.status;

    await this.lessonRepository.save(lesson);
    return this.findByIdWithSentences(id);
  }

  /**
   * Admin xóa bài học (CSDL tự động cascade xóa các câu)
   */
  async deleteLesson(id: string): Promise<{ success: boolean; message: string }> {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${id}`);
    }

    await this.lessonRepository.delete(id);
    return {
      success: true,
      message: `Đã xóa bài học "${lesson.title}" thành công.`,
    };
  }

  /**
   * Thêm 1 câu mới vào bài học
   */
  async addSentence(lessonId: string, dto: CreateSentenceDto): Promise<LessonSentence> {
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${lessonId}`);
    }

    const wordsJson =
      dto.wordsJson && dto.wordsJson.length > 0
        ? dto.wordsJson
        : this.buildWordsLinear(dto.textContent, dto.startTime, dto.endTime);

    const sentence = this.sentenceRepository.create({
      lessonId,
      orderIndex: dto.orderIndex,
      startTime: dto.startTime,
      endTime: dto.endTime,
      textContent: dto.textContent.trim(),
      wordsJson,
    });

    return this.sentenceRepository.save(sentence);
  }

  /**
   * Cập nhật 1 câu cụ thể trong bài học
   */
  async updateSentence(lessonId: string, sentenceId: string, dto: UpdateSentenceDto): Promise<LessonSentence> {
    const sentence = await this.sentenceRepository.findOne({
      where: { id: sentenceId, lessonId },
    });
    if (!sentence) {
      throw new NotFoundException(`Không tìm thấy câu với ID: ${sentenceId} trong bài học này`);
    }

    if (dto.orderIndex !== undefined) sentence.orderIndex = dto.orderIndex;
    if (dto.startTime !== undefined) sentence.startTime = dto.startTime;
    if (dto.endTime !== undefined) sentence.endTime = dto.endTime;
    if (dto.textContent !== undefined) {
      sentence.textContent = dto.textContent.trim();
      // Nếu có cập nhật textContent mà không truyền wordsJson, tự cập nhật lại wordsJson
      if (!dto.wordsJson) {
        sentence.wordsJson = this.buildWordsLinear(sentence.textContent, sentence.startTime, sentence.endTime);
      }
    }
    if (dto.wordsJson !== undefined) {
      sentence.wordsJson = dto.wordsJson;
    }

    return this.sentenceRepository.save(sentence);
  }

  /**
   * Xóa 1 câu trong bài học
   */
  async deleteSentence(lessonId: string, sentenceId: string): Promise<{ success: boolean; message: string }> {
    const sentence = await this.sentenceRepository.findOne({
      where: { id: sentenceId, lessonId },
    });
    if (!sentence) {
      throw new NotFoundException(`Không tìm thấy câu với ID: ${sentenceId} trong bài học này`);
    }

    await this.sentenceRepository.delete(sentenceId);
    return {
      success: true,
      message: `Đã xóa câu thứ tự ${sentence.orderIndex} thành công.`,
    };
  }

  /**
   * Ghi đè toàn bộ danh sách câu của bài học (Bulk replace)
   */
  async bulkSetSentences(lessonId: string, sentences: CreateSentenceDto[]): Promise<LessonSentence[]> {
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${lessonId}`);
    }

    // Xóa tất cả các câu hiện tại của bài học này
    await this.sentenceRepository.delete({ lessonId });

    // Tạo danh sách câu mới
    const entities = sentences.map((s, index) => {
      const wordsJson =
        s.wordsJson && s.wordsJson.length > 0
          ? s.wordsJson
          : this.buildWordsLinear(s.textContent, s.startTime, s.endTime);

      return this.sentenceRepository.create({
        lessonId,
        orderIndex: s.orderIndex !== undefined ? s.orderIndex : index,
        startTime: s.startTime,
        endTime: s.endTime,
        textContent: s.textContent.trim(),
        wordsJson,
      });
    });

    return this.sentenceRepository.save(entities);
  }

  /**
   * Tự động trích xuất phụ đề AI (AI Auto-Transcription) từ YouTube URL hoặc WebVTT
   */
  /**
   * Định dạng danh sách câu thô thành định dạng chuẩn có wordsJson và durationSeconds
   */
  private formatTranscribeResult(
    parsedSentences: Array<{ orderIndex: number; startTime: number; endTime: number; text: string }>,
  ) {
    if (!parsedSentences.length) {
      throw new BadRequestException('Không tìm thấy câu phụ đề tiếng Anh nào từ nguồn media.');
    }

    const durationSeconds = Math.ceil(Math.max(...parsedSentences.map((s) => s.endTime), 1));

    const sentences = parsedSentences.map((sentence, index) => {
      const words = sentence.text.trim().split(/\s+/).filter(Boolean);
      const step = (sentence.endTime - sentence.startTime) / Math.max(words.length, 1);
      return {
        orderIndex: sentence.orderIndex !== undefined ? sentence.orderIndex : index + 1,
        startTime: sentence.startTime,
        endTime: sentence.endTime,
        textContent: sentence.text.trim(),
        wordsJson: words.map((word, wIdx) => ({
          word: word.replace(/[.,!?;:"'()]/g, ''),
          start: Number((sentence.startTime + wIdx * step).toFixed(2)),
          end: Number((sentence.startTime + (wIdx + 1) * step).toFixed(2)),
        })),
      };
    });

    return {
      durationSeconds,
      sentenceCount: sentences.length,
      sentences,
    };
  }

  /**
   * Tự động trích xuất phụ đề AI (AI Auto-Transcription) từ YouTube URL, file WebVTT, hoặc file âm thanh
   */
  async autoTranscribe(mediaUrl?: string, captionsVtt?: string) {
    if (!mediaUrl?.trim() && !captionsVtt?.trim()) {
      throw new BadRequestException('Vui lòng cung cấp URL media hoặc nội dung phụ đề WebVTT.');
    }

    let parsedSentences: Array<{ orderIndex: number; startTime: number; endTime: number; text: string }> = [];

    // 1. Phụ đề WebVTT
    if (captionsVtt && captionsVtt.trim()) {
      parsedSentences = parseWebVtt(captionsVtt.trim());
      return this.formatTranscribeResult(parsedSentences);
    }

    const trimmedUrl = (mediaUrl || '').trim();

    // 2. Kiểm tra mẫu có sẵn (built-in sample lessons)
    for (const [key, sampleSentences] of Object.entries(SAMPLE_AUDIO_TRANSCRIPTS)) {
      if (trimmedUrl.includes(key)) {
        return this.formatTranscribeResult(sampleSentences);
      }
    }

    // 3. Kiểm tra nguồn YouTube
    if (trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be')) {
      parsedSentences = await fetchYouTubeSentences(trimmedUrl);
      return this.formatTranscribeResult(parsedSentences);
    }

    // 4. Kiểm tra file âm thanh cục bộ (Local Audio Path: /audio/... hoặc tương đối)
    if (trimmedUrl.startsWith('/') || !trimmedUrl.includes('://')) {
      const cleanPath = trimmedUrl.replace(/^\//, '');
      const possiblePaths = [
        path.resolve(process.cwd(), '../frontend/public', cleanPath),
        path.resolve(process.cwd(), 'public', cleanPath),
        path.resolve(process.cwd(), cleanPath),
      ];
      const foundPath = possiblePaths.find((p) => fs.existsSync(p));

      if (foundPath) {
        const fileBuffer = fs.readFileSync(foundPath);
        const ext = path.extname(foundPath).replace('.', '') || 'mp3';
        parsedSentences = await this.speechService.transcribeAudioBufferWithTimestamps(
          fileBuffer,
          `audio/${ext}`,
        );
        return this.formatTranscribeResult(parsedSentences);
      }
    }

    // 5. Kiểm tra URL âm thanh từ xa (http/https mp3, wav, m4a, ogg,...)
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      try {
        const response = await fetch(trimmedUrl);
        if (!response.ok) {
          throw new BadRequestException(
            `Không thể tải tệp âm thanh từ URL (${response.status} ${response.statusText}).`,
          );
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const ext = trimmedUrl.split('?')[0].split('.').pop() || 'mp3';
        parsedSentences = await this.speechService.transcribeAudioBufferWithTimestamps(
          buffer,
          `audio/${ext}`,
        );
        return this.formatTranscribeResult(parsedSentences);
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        throw new BadRequestException(`Lỗi khi tải hoặc nhận diện file âm thanh từ URL: ${err.message}`);
      }
    }

    throw new BadRequestException(
      'Không hỗ trợ định dạng nguồn này. Vui lòng cung cấp URL YouTube có phụ đề, đường dẫn file âm thanh (.mp3, .wav), hoặc nội dung WebVTT.',
    );
  }

  /**
   * Tự động trích xuất trực tiếp từ file âm thanh tải lên (Buffer)
   */
  async autoTranscribeFromBuffer(buffer: Buffer, originalname = 'audio.mp3') {
    const ext = originalname.split('.').pop() || 'mp3';
    const parsedSentences = await this.speechService.transcribeAudioBufferWithTimestamps(
      buffer,
      `audio/${ext}`,
    );
    return this.formatTranscribeResult(parsedSentences);
  }

  /**
   * Tự động trích xuất và lưu đè câu thoại cho bài học đã có
   */
  async autoTranscribeAndSave(lessonId: string, mediaUrl?: string, captionsVtt?: string) {
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${lessonId}`);
    }

    const targetUrl = mediaUrl?.trim() || lesson.audioUrl;
    const result = await this.autoTranscribe(targetUrl, captionsVtt);

    // Cập nhật lại thời lượng bài học nếu cần
    if (result.durationSeconds > 0) {
      lesson.durationSeconds = result.durationSeconds;
      await this.lessonRepository.save(lesson);
    }

    // Ghi đè danh sách câu thoại
    await this.bulkSetSentences(lessonId, result.sentences);

    return this.findByIdWithSentences(lessonId);
  }

  /**
   * Tự động trích xuất từ file tải lên và lưu trực tiếp vào bài học
   */
  async autoTranscribeAndSaveFromBuffer(lessonId: string, buffer: Buffer, originalname = 'audio.mp3') {
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${lessonId}`);
    }

    const result = await this.autoTranscribeFromBuffer(buffer, originalname);

    if (result.durationSeconds > 0) {
      lesson.durationSeconds = result.durationSeconds;
      await this.lessonRepository.save(lesson);
    }

    await this.bulkSetSentences(lessonId, result.sentences);
    return this.findByIdWithSentences(lessonId);
  }
}


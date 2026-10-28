import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';
import { scoreDictation } from '../practice/dictation/dictation-scorer';

export interface WordScoreDetail {
  word: string;
  accuracy_score: number;
  error_type: 'None' | 'Mispronunciation' | 'Substitution' | 'Omission' | 'Insertion';
}

export interface AssessmentResult {
  overall_score: number;
  accuracy_score: number;
  fluency_score: number;
  completeness_score: number;
  words_score_detail: WordScoreDetail[];
  recognized_text?: string;
  source: 'OPENAI' | 'MOCK';
}

const AUDIO_FORMATS: Record<string, { extension: string; mimeType: string }> = {
  'audio/webm': { extension: 'webm', mimeType: 'audio/webm' },
  'audio/wav': { extension: 'wav', mimeType: 'audio/wav' },
  'audio/x-wav': { extension: 'wav', mimeType: 'audio/wav' },
  'audio/mpeg': { extension: 'mp3', mimeType: 'audio/mpeg' },
  'audio/mp3': { extension: 'mp3', mimeType: 'audio/mpeg' },
  'audio/mpga': { extension: 'mpga', mimeType: 'audio/mpga' },
  'audio/ogg': { extension: 'ogg', mimeType: 'audio/ogg' },
  'audio/mp4': { extension: 'm4a', mimeType: 'audio/mp4' },
  'audio/m4a': { extension: 'm4a', mimeType: 'audio/mp4' },
  'audio/flac': { extension: 'flac', mimeType: 'audio/flac' },
};

@Injectable()
export class SpeechService {
  private readonly logger = new Logger(SpeechService.name);
  private openai: OpenAI | null = null;

  constructor(private readonly configService: ConfigService) {
    if (!this.configService.get<string>('OPENAI_API_KEY')?.trim()) {
      this.logger.warn(this.isMockFallbackEnabled()
        ? 'OPENAI_API_KEY chưa được cấu hình. Shadowing đang dùng chế độ chấm giả lập (MOCK) ngoài production.'
        : 'OPENAI_API_KEY chưa được cấu hình. Chấm điểm Shadowing sẽ không hoạt động.');
    }
  }

  /**
   * Nhận diện lời nói bằng OpenAI Whisper rồi so khớp transcript với câu mẫu.
   * Whisper không trả về điểm phát âm/độ trôi chảy âm học; các điểm trong
   * hợp đồng hiện tại đều là ước lượng dựa trên mức độ khớp transcript.
   * audioFormat có thể là MIME type hoặc tên file để giữ đúng định dạng upload.
   */
  async assessPronunciation(
    audioBuffer: Buffer,
    referenceText: string,
    audioFormat = 'audio/webm',
  ): Promise<AssessmentResult> {
    if (!audioBuffer?.length) {
      throw new BadRequestException('Tệp âm thanh ghi âm không có dữ liệu.');
    }
    if (!referenceText?.trim()) {
      throw new BadRequestException('Câu mẫu để chấm điểm không được để trống.');
    }

    const format = this.resolveAudioFormat(audioFormat);
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      if (this.isMockFallbackEnabled()) {
        return this.mockAssessment(referenceText, 'OPENAI_API_KEY chưa được cấu hình');
      }
      throw new InternalServerErrorException(
        'OpenAI Whisper API chưa được cấu hình (thiếu OPENAI_API_KEY).',
      );
    }

    try {
      if (!this.openai) {
        this.openai = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 0 });
      }

      const file = await toFile(audioBuffer, `recording.${format.extension}`, {
        type: format.mimeType,
      });
      const transcription = await this.openai.audio.transcriptions.create({
        file,
        model: this.configService.get<string>('OPENAI_TRANSCRIPTION_MODEL')?.trim() || 'whisper-1',
        language: 'en',
      });

      const recognizedText = transcription.text?.trim() ?? '';
      const comparison = scoreDictation(referenceText, recognizedText, 0);
      const score = comparison.accuracy;

      return {
        overall_score: score,
        accuracy_score: score,
        fluency_score: score,
        completeness_score: score,
        words_score_detail: comparison.words.map((word) => ({
          word: word.word,
          accuracy_score: word.accuracy_score,
          error_type: word.error_type,
        })),
        recognized_text: recognizedText,
        source: 'OPENAI',
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }

      const status = typeof error === 'object' && error !== null && 'status' in error
        ? Number((error as { status?: unknown }).status)
        : undefined;
      const detail = error instanceof Error ? error.message : String(error);

      if (this.isMockFallbackEnabled() && status !== 400 && status !== 413 && status !== 415) {
        return this.mockAssessment(
          referenceText,
          `OpenAI Whisper lỗi${status ? ` ${status}` : ''}: ${detail}`,
        );
      }

      this.logger.error(`OpenAI Whisper transcription failed${status ? ` (${status})` : ''}: ${detail}`);

      if (status === 401 || status === 403) {
        throw new InternalServerErrorException(
          `OpenAI authentication failed (${status}). Kiểm tra OPENAI_API_KEY và quyền truy cập API.`,
        );
      }
      if (status === 400 || status === 413 || status === 415) {
        throw new BadRequestException(
          `OpenAI Whisper từ chối tệp âm thanh (${status}): ${detail}`,
        );
      }
      throw new InternalServerErrorException(
        `Lỗi xử lý giọng nói từ OpenAI Whisper${status ? ` (${status})` : ''}: ${detail}`,
      );
    }
  }

  /**
   * Tự động trích xuất các câu thoại kèm mốc thời gian (start, end) từ Buffer âm thanh bằng OpenAI Whisper
   */
  async transcribeAudioBufferWithTimestamps(
    audioBuffer: Buffer,
    audioFormat = 'audio/mp3',
  ): Promise<Array<{ orderIndex: number; startTime: number; endTime: number; text: string }>> {
    if (!audioBuffer?.length) {
      throw new BadRequestException('Tệp âm thanh không có dữ liệu.');
    }

    const format = this.resolveAudioFormat(audioFormat);
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();

    if (!apiKey) {
      if (this.isMockFallbackEnabled()) {
        this.logger.warn('OpenAI API Key chưa được cấu hình, trả về các câu mẫu giả lập cho âm thanh.');
        return [
          { orderIndex: 1, startTime: 0.0, endTime: 3.5, text: 'Hello, welcome to this English listening lesson.' },
          { orderIndex: 2, startTime: 3.8, endTime: 7.2, text: 'We are practicing English pronunciation and dictation today.' },
          { orderIndex: 3, startTime: 7.5, endTime: 11.0, text: 'Please listen carefully and repeat after the speaker.' },
        ];
      }
      throw new BadRequestException(
        'Tính năng trích xuất phụ đề từ file âm thanh cần cấu hình OPENAI_API_KEY để sử dụng OpenAI Whisper.',
      );
    }

    try {
      if (!this.openai) {
        this.openai = new OpenAI({ apiKey, timeout: 60_000, maxRetries: 1 });
      }

      const file = await toFile(audioBuffer, `audio.${format.extension}`, {
        type: format.mimeType,
      });

      const transcription: any = await this.openai.audio.transcriptions.create({
        file,
        model: this.configService.get<string>('OPENAI_TRANSCRIPTION_MODEL')?.trim() || 'whisper-1',
        language: 'en',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      });

      if (Array.isArray(transcription.segments) && transcription.segments.length > 0) {
        return transcription.segments.map((seg: any, idx: number) => ({
          orderIndex: idx + 1,
          startTime: Number(Number(seg.start).toFixed(2)),
          endTime: Number(Number(seg.end).toFixed(2)),
          text: String(seg.text).trim(),
        }));
      }

      if (transcription.text?.trim()) {
        return [
          {
            orderIndex: 1,
            startTime: 0.0,
            endTime: Number((transcription.duration || 5).toFixed(2)),
            text: transcription.text.trim(),
          },
        ];
      }

      throw new BadRequestException('Không nhận diện được giọng nói tiếng Anh trong tệp âm thanh.');
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`OpenAI Whisper transcription failed: ${err.message}`);
      if (this.isMockFallbackEnabled()) {
        return [
          { orderIndex: 1, startTime: 0.0, endTime: 3.5, text: 'Hello, welcome to this English listening lesson.' },
          { orderIndex: 2, startTime: 3.8, endTime: 7.2, text: 'We are practicing English pronunciation and dictation today.' },
        ];
      }
      throw new BadRequestException(`Lỗi khi nhận diện file âm thanh qua Whisper: ${err.message}`);
    }
  }

  healthCheck() {
    const configured = Boolean(this.configService.get<string>('OPENAI_API_KEY')?.trim());
    const model = this.configService.get<string>('OPENAI_TRANSCRIPTION_MODEL')?.trim() || 'whisper-1';
    return {
      status: configured ? 'configured' : 'missing_credentials',
      provider: 'openai-whisper',
      model,
      assessment_mode: configured ? 'OPENAI' : this.isMockFallbackEnabled() ? 'MOCK' : 'UNAVAILABLE',
      openai_configured: configured,
      mock_fallback_enabled: this.isMockFallbackEnabled(),
      missing: configured ? [] : ['OPENAI_API_KEY'],
    };
  }

  private isMockFallbackEnabled() {
    const nodeEnv = (this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? '').trim().toLowerCase();
    const configured = this.configService.get<string>('SPEECH_MOCK_FALLBACK')?.trim().toLowerCase();

    // Synthetic scores are allowed only in development/test. Production and
    // unknown environments fail closed so mock data cannot enter real accounts.
    if (!['development', 'test'].includes(nodeEnv) || configured === 'false') return false;
    return true;
  }

  private mockAssessment(referenceText: string, reason: string): AssessmentResult {
    this.logger.warn(`Chuyển sang chế độ chấm giả lập (MOCK): ${reason}`);
    const comparison = scoreDictation(referenceText, referenceText, 0);

    return {
      overall_score: 95,
      accuracy_score: 95,
      fluency_score: 94,
      completeness_score: 100,
      words_score_detail: comparison.words.map((word) => ({
        word: word.word,
        accuracy_score: word.accuracy_score,
        error_type: word.error_type,
      })),
      recognized_text: referenceText,
      source: 'MOCK',
    };
  }

  private resolveAudioFormat(audioFormat: string) {
    const normalized = audioFormat.split(';')[0].trim().toLowerCase();
    const mimeFormat = AUDIO_FORMATS[normalized];
    if (mimeFormat) return mimeFormat;

    const extension = normalized.includes('.')
      ? normalized.slice(normalized.lastIndexOf('.') + 1)
      : normalized.replace(/^\./, '');
    const extensionFormat = Object.values(AUDIO_FORMATS).find((format) => format.extension === extension);
    if (extensionFormat) return extensionFormat;

    throw new BadRequestException('Định dạng âm thanh không được OpenAI Whisper hỗ trợ.');
  }
}

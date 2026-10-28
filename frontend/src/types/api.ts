// Kiểu dữ liệu dùng chung với Core API (theo SRS mục 3.3 và 3.4).
// Khi API thật khác mẫu, sửa tại đây để TypeScript báo lỗi ở mọi chỗ dùng.

export type UserRole = 'STUDENT' | 'PREMIUM_STUDENT' | 'ADMIN';
export type LessonLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type AttemptStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type WordErrorType = 'None' | 'Mispronunciation' | 'Substitution' | 'Omission' | 'Insertion';

export interface Lesson {
  id: string;
  title: string;
  level: LessonLevel;
  audioUrl: string;
  isPremiumOnly: boolean;
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface LessonSentence {
  id: string;
  lessonId: string;
  startTime: number;
  endTime: number;
  textContent: string;
  wordsJson: WordTiming[];
}

export interface WordScore {
  word: string;
  accuracy_score: number;
  error_type: WordErrorType;
}

export interface ShadowingScore {
  overall_score: number;
  accuracy_score: number;
  fluency_score: number;
  completeness_score: number;
  words_score_detail: WordScore[];
}

/** Phản hồi của GET /practice/shadowing/status/:attemptId */
export interface ShadowingStatus {
  attempt_id: string;
  status: AttemptStatus;
  score: ShadowingScore | null;
}

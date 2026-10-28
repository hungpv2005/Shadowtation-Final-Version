'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, X } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { compareDictation, hintPenalty, maskedHint, type DictationScore } from '@/lib/dictation';
import { MediaDictationPlayer } from './media-dictation-player';
import { ShadowingPractice } from './shadowing-practice';
import { clearShadowingRecordings } from './shadowing-recordings';
import { VocabularyReviewSection } from './vocabulary-review-section';
import { useLanguage } from '@/lib/i18n';

type Lesson = { id: string; title: string; level: string; audioUrl?: string | null; mediaType?: 'AUDIO' | 'VIDEO' | 'PODCAST'; sourceName?: string | null; sourceUrl?: string | null; durationSeconds?: number | null; isPremiumOnly: boolean; access: 'AVAILABLE' | 'LOCKED'; sentenceCount: number; isCustom?: boolean };
type Sentence = { id: string; startTime: number; endTime: number; textContent: string; wordsJson: { word: string; start: number; end: number }[] };
type Submission = { sentenceId: string; textInput: string; hintCount: number; usedTranscriptHint: boolean };
type LessonDraft = {
  lessonId: string; answers: Record<string, string>; current: number;
  hintCounts: Record<string, number>; transcriptUsed: Record<string, boolean>;
  scores: Record<string, DictationScore>; mode: 'FULL' | 'BLANKS'; savedAt: string;
  isCompleted?: boolean; totalScore?: number | null;
};
type PracticeMode = 'DICTATION' | 'SHADOWING';
type ShadowingSource = 'OPENAI' | 'MOCK' | 'LEGACY';
type ShadowingDraft = { lessonId: string; current: number; scores: Record<string, number>; sources?: Record<string, ShadowingSource>; savedAt: string; isCompleted?: boolean; totalScore?: number | null };
type RecentLesson = { lessonId: string; lastOpenedAt: string; status: 'IN_PROGRESS' | 'COMPLETED'; mode?: PracticeMode };
type LibraryProgress = { lessonId: string; mode: PracticeMode; lastOpenedAt: string; completedCount: number; isCompleted: boolean; hasDraft?: boolean; totalScore?: number | null };
type RecentLibraryLesson = { lesson: Lesson; progressByMode: Partial<Record<PracticeMode, LibraryProgress>>; latestProgress: LibraryProgress };
type ResumeSelection = { lesson: Lesson; fromLibrary: boolean; progress: LibraryProgress };

const DRAFT_KEY = 'shadowtation.dictation.draft';
const PENDING_KEY = 'shadowtation.dictation.pending';
const FAVORITES_KEY = 'shadowtation.dictation.favorites';
const RECENT_KEY = 'shadowtation.dictation.recent';
const SHADOWING_DRAFT_KEY = 'shadowtation.shadowing.draft';
const lessonDraftKey = (lessonId: string) => `${DRAFT_KEY}:${lessonId}`;
const shadowingDraftKey = (lessonId: string) => `${SHADOWING_DRAFT_KEY}:${lessonId}`;
const shadowingAttemptsKey = (lessonId: string) => `shadowtation.shadowing.attempts:${lessonId}`;
function readLessonDraft(lessonId: string): LessonDraft | null {
  try {
    const raw = localStorage.getItem(lessonDraftKey(lessonId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<LessonDraft>;
    if (draft.lessonId !== lessonId || !draft.answers || !Number.isFinite(draft.current)) return null;
    return {
      lessonId,
      answers: draft.answers,
      current: draft.current!,
      hintCounts: draft.hintCounts ?? {},
      transcriptUsed: draft.transcriptUsed ?? {},
      scores: draft.scores ?? {},
      mode: draft.mode === 'BLANKS' ? 'BLANKS' : 'FULL',
      savedAt: draft.savedAt ?? new Date(0).toISOString(),
      isCompleted: draft.isCompleted === true,
      totalScore: Number.isFinite(draft.totalScore) ? draft.totalScore! : null,
    };
  } catch { return null; }
}
function readLessonDrafts(): LessonDraft[] {
  const drafts: LessonDraft[] = [];
  const prefix = `${DRAFT_KEY}:`;
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const draft = readLessonDraft(key.slice(prefix.length));
      if (draft) drafts.push(draft);
    }
  } catch { return drafts; }
  return drafts.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
function readShadowingDraft(lessonId: string): ShadowingDraft | null {
  try {
    const raw = localStorage.getItem(shadowingDraftKey(lessonId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<ShadowingDraft>;
    if (draft.lessonId !== lessonId || !Number.isFinite(draft.current) || !draft.scores) return null;
    return { lessonId, current: draft.current!, scores: draft.scores, sources: draft.sources ?? {}, savedAt: draft.savedAt ?? new Date(0).toISOString(), isCompleted: draft.isCompleted === true, totalScore: Number.isFinite(draft.totalScore) ? draft.totalScore! : null };
  } catch { return null; }
}
function readShadowingDrafts(): ShadowingDraft[] {
  const drafts: ShadowingDraft[] = [];
  const prefix = `${SHADOWING_DRAFT_KEY}:`;
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const draft = readShadowingDraft(key.slice(prefix.length));
      if (draft) drafts.push(draft);
    }
  } catch { return drafts; }
  return drafts.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
function readRecentLessons(): RecentLesson[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as RecentLesson[];
    return Array.isArray(value) ? value.filter((item) => item?.lessonId && item?.lastOpenedAt) : [];
  } catch { return []; }
}
function youtubeId(value: string) { try { const url = new URL(value); if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''; if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0]; if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(url.hostname)) return url.searchParams.get('v') || url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1] || ''; } catch {} return ''; }
function formatDuration(seconds?: number | null) { if (!seconds || seconds < 1) return 'Chưa rõ thời lượng'; const total = Math.floor(seconds); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`; }
function mediaTypeLabel(type?: Lesson['mediaType']) { if (type === 'VIDEO') return '▶ Video YouTube'; if (type === 'PODCAST') return '◉ Podcast'; return '♫ Audio'; }
function hasLoginToken() { return typeof window !== 'undefined' && Boolean(localStorage.getItem('access_token') ?? localStorage.getItem('accessToken')); }

function DictationPracticeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, t } = useLanguage();
  const selectedLessonId = searchParams.get('lesson');
  const sentenceToOpenId = searchParams.get('sentence');
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(searchParams.get('mode') === 'shadowing' ? 'SHADOWING' : 'DICTATION');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [savedDrafts, setSavedDrafts] = useState<LessonDraft[]>([]);
  const [savedShadowingDrafts, setSavedShadowingDrafts] = useState<ShadowingDraft[]>([]);
  const [recentLessons, setRecentLessons] = useState<RecentLesson[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [mediaFilter, setMediaFilter] = useState('ALL');
  const [showFavorites, setShowFavorites] = useState(false);
  const [libraryView, setLibraryView] = useState<'AVAILABLE' | 'RECENT' | 'CUSTOM' | 'VOCAB_REVIEW'>('AVAILABLE');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((current) => (current === msg ? null : current)), 3200);
  };
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [captionsVtt, setCaptionsVtt] = useState('');
  const [useYoutubeCaptions, setUseYoutubeCaptions] = useState(true);
  const [customMediaType, setCustomMediaType] = useState<'AUDIO' | 'VIDEO' | 'PODCAST'>('VIDEO');
  const [customLevel, setCustomLevel] = useState('BEGINNER');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubeError, setYoutubeError] = useState('');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lockedLesson, setLockedLesson] = useState<Lesson | null>(null);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dictationCurrent, setDictationCurrent] = useState(0);
  const [shadowingCurrent, setShadowingCurrent] = useState(0);
  const [mode, setMode] = useState<'FULL' | 'BLANKS'>('FULL');
  const [hintLevel, setHintLevel] = useState(0);
  const [hintCounts, setHintCounts] = useState<Record<string, number>>({});
  const [hintPenalties, setHintPenalties] = useState<number[]>([0, 5, 10, 20]);
  const [transcriptOn, setTranscriptOn] = useState(false);
  const [transcriptUsed, setTranscriptUsed] = useState<Record<string, boolean>>({});
  const [scores, setScores] = useState<Record<string, DictationScore>>({});
  const [dictationStarted, setDictationStarted] = useState(false);
  const [shadowingScores, setShadowingScores] = useState<Record<string, number>>({});
  const [shadowingSources, setShadowingSources] = useState<Record<string, ShadowingSource>>({});
  const [shadowingLessonCompleted, setShadowingLessonCompleted] = useState(false);
  const [shadowingStarted, setShadowingStarted] = useState(false);
  const [mediaTime, setMediaTime] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [completionScore, setCompletionScore] = useState<number | null>(null);
  const [completionSyncPending, setCompletionSyncPending] = useState(false);
  const [debouncedAnswer, setDebouncedAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [resumeSelection, setResumeSelection] = useState<ResumeSelection | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [fillReset, setFillReset] = useState(0);
  const openedFromLibraryRef = useRef(false);
  const isLeavingLessonRef = useRef(false);
  const activeLessonIdRef = useRef<string | null>(null);
  const latestDraftRef = useRef<LessonDraft | null>(null);
  const latestShadowingDraftRef = useRef<ShadowingDraft | null>(null);
  const practiceModeRef = useRef(practiceMode);
  const beginLessonRef = useRef<(item: Lesson, fromLibrary?: boolean, promptForProgress?: boolean, requestedMode?: PracticeMode) => void>(() => {});
  practiceModeRef.current = practiceMode;

  const current = practiceMode === 'DICTATION' ? dictationCurrent : shadowingCurrent;
  function setCurrent(index: number) {
    if (practiceMode === 'DICTATION') setDictationCurrent(index);
    else setShadowingCurrent(index);
  }

  useEffect(() => {
    const requestedMode = searchParams.get('mode') === 'shadowing' ? 'SHADOWING' : 'DICTATION';
    if (lesson && selectedLessonId !== lesson.id) {
      const lockedMode = practiceModeRef.current;
      if (!selectedLessonId) {
        persistLatestDraft();
        openedFromLibraryRef.current = false;
        isLeavingLessonRef.current = true;
        activeLessonIdRef.current = null;
        clearActiveLesson();
        setLibraryView('AVAILABLE');
        setPracticeMode(lockedMode);
        router.replace(`/practice/dictation?mode=${lockedMode.toLowerCase()}`, { scroll: false });
        window.dispatchEvent(new Event('shadowtation:practice-mode'));
      } else {
        router.replace(`/practice/dictation?lesson=${encodeURIComponent(lesson.id)}&mode=${lockedMode.toLowerCase()}`, { scroll: false });
      }
      return;
    }
    if (lesson) {
      if (requestedMode !== practiceModeRef.current) {
        router.replace(`/practice/dictation?lesson=${encodeURIComponent(lesson.id)}&mode=${practiceModeRef.current.toLowerCase()}`, { scroll: false });
      } else window.dispatchEvent(new Event('shadowtation:practice-mode'));
      return;
    }
    setPracticeMode(requestedMode);
    window.dispatchEvent(new Event('shadowtation:practice-mode'));
  }, [searchParams, selectedLessonId, router]);

  useEffect(() => {
    return () => { activeLessonIdRef.current = null; };
  }, []);

  useEffect(() => {
    try { setFavorites(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]')); } catch { localStorage.removeItem(FAVORITES_KEY); }
    setSavedDrafts(readLessonDrafts());
    setSavedShadowingDrafts(readShadowingDrafts());
    setRecentLessons(readRecentLessons());
    apiFetch<{ items: Lesson[] }>('/practice/dictation/lessons')
      .then((data) => setLessons(data.items))
      .catch((e: Error) => setError(e.message || 'Không tải được danh sách bài học.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!lessons.length || lesson || !selectedLessonId || isLeavingLessonRef.current || resumeSelection?.lesson.id === selectedLessonId) return;
    const selected = lessons.find((item) => item.id === selectedLessonId);
    if (!selected) return;
    if (selected.access === 'LOCKED') setLockedLesson(selected);
    else beginLessonRef.current(selected, false, false, searchParams.get('mode') === 'shadowing' ? 'SHADOWING' : 'DICTATION');
  }, [lessons, lesson, selectedLessonId, resumeSelection, searchParams]);

  function progressFor(lessonId: string, requestedMode: PracticeMode): LibraryProgress | null {
    if (requestedMode === 'DICTATION') {
      const draft = readLessonDraft(lessonId);
      return draft ? { lessonId, mode: requestedMode, lastOpenedAt: draft.savedAt, completedCount: Object.keys(draft.scores).length, isCompleted: Boolean(draft.isCompleted), hasDraft: true, totalScore: draft.totalScore } : null;
    }
    const draft = readShadowingDraft(lessonId);
    return draft ? { lessonId, mode: requestedMode, lastOpenedAt: draft.savedAt, completedCount: Object.keys(draft.scores).length, isCompleted: Boolean(draft.isCompleted), hasDraft: true, totalScore: draft.totalScore } : null;
  }

  function beginLesson(item: Lesson, fromLibrary = true, promptForProgress = false, requestedMode = practiceMode) {
    if (!hasLoginToken()) { setLoginPrompt(true); return; }
    if (item.access === 'LOCKED') { setLockedLesson(item); return; }
    const savedProgress = promptForProgress ? progressFor(item.id, requestedMode) : null;
    if (savedProgress) {
      if (requestedMode !== practiceMode) {
        setPracticeMode(requestedMode);
        router.replace(`/practice/dictation?mode=${requestedMode.toLowerCase()}`, { scroll: false });
        window.dispatchEvent(new Event('shadowtation:practice-mode'));
      }
      setResumeSelection({ lesson: item, fromLibrary, progress: savedProgress });
      return;
    }
    startLesson(item, fromLibrary, requestedMode);
  }

  function resumeSavedLesson() {
    if (!resumeSelection) return;
    const { lesson: selected, fromLibrary, progress } = resumeSelection;
    setResumeSelection(null);
    startLesson(selected, fromLibrary, progress.mode);
  }

  async function restartSavedLesson() {
    if (!resumeSelection) return;
    const { lesson: selected, fromLibrary, progress } = resumeSelection;
    if (progress.mode === 'SHADOWING') {
      try { await clearShadowingRecordings(selected.id); }
      catch { setError('Không xóa được các bản ghi cũ trên thiết bị.'); return; }
    }
    clearModeProgress(selected.id, progress.mode);
    setSavedDrafts(readLessonDrafts());
    setSavedShadowingDrafts(readShadowingDrafts());
    setResumeSelection(null);
    startLesson(selected, fromLibrary, progress.mode);
  }

  function startLesson(item: Lesson, fromLibrary: boolean, requestedMode = practiceMode) {
    openedFromLibraryRef.current = fromLibrary;
    isLeavingLessonRef.current = false;
    activeLessonIdRef.current = item.id;
    latestDraftRef.current = null;
    latestShadowingDraftRef.current = null;
    setPracticeMode(requestedMode);
    if (fromLibrary) router.push(`/practice/dictation?lesson=${encodeURIComponent(item.id)}&mode=${requestedMode.toLowerCase()}`);
    setDraftReady(false);
    setSentences([]);
    setAnswers({});
    setDictationCurrent(0);
    setShadowingCurrent(0);
    setHintLevel(0);
    setHintCounts({});
    setTranscriptOn(false);
    setTranscriptUsed({});
    setScores({});
    setDictationStarted(requestedMode === 'DICTATION');
    setShadowingScores({});
    setShadowingSources({});
    setShadowingLessonCompleted(false);
    setShadowingStarted(requestedMode === 'SHADOWING');
    setHasCompleted(false);
    setCompletionScore(null);
    setCompletionSyncPending(false);
    setMode('FULL');
    setFinished(false);
    setLesson(item);
    setError('');
    setRecentLesson(item.id, 'IN_PROGRESS', requestedMode);
  }

  function changePracticeMode(nextMode: PracticeMode) {
    if (lesson || nextMode === practiceMode) return;
    setError('');
    setPracticeMode(nextMode);
    router.replace(`/practice/dictation?mode=${nextMode.toLowerCase()}`, { scroll: false });
    window.dispatchEvent(new Event('shadowtation:practice-mode'));
  }

  beginLessonRef.current = beginLesson;

  function setRecentLesson(lessonId: string, status: RecentLesson['status'], requestedMode = practiceMode) {
    const next: RecentLesson[] = [{ lessonId, mode: requestedMode, lastOpenedAt: new Date().toISOString(), status }, ...readRecentLessons().filter((item) => item.lessonId !== lessonId || (item.mode ?? 'DICTATION') !== requestedMode)].slice(0, 24);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* Keep the active lesson usable if storage is full. */ }
    setRecentLessons(next);
  }

  useEffect(() => {
    if (!lesson) { setDraftReady(false); return; }
    let cancelled = false;
    setDraftReady(false);
    apiFetch<{ sentences: Sentence[]; hintPenalties?: number[] }>(`/lessons/${lesson.id}/sentences`)
      .then((data) => {
        if (cancelled) return;
        if (!data.sentences.length || data.sentences.some((item) => !item.textContent?.trim() || !Number.isFinite(item.startTime) || !Number.isFinite(item.endTime) || item.endTime <= item.startTime)) {
          throw new Error('Bài học chưa có transcript hoặc mốc thời gian hợp lệ. Quay lại danh sách để chọn bài khác.');
        }
        setSentences(data.sentences);
        if (data.hintPenalties?.length === 4) setHintPenalties(data.hintPenalties);
        const legacyRaw = localStorage.getItem(DRAFT_KEY);
        if (legacyRaw) {
          try {
            const legacy = JSON.parse(legacyRaw) as { lessonId?: string; answers?: Record<string, string>; current?: number; pendingSubmission?: { lessonId?: string; answers?: Submission[] } };
            if (legacy.pendingSubmission?.lessonId === lesson.id) localStorage.setItem(PENDING_KEY, JSON.stringify(legacy.pendingSubmission));
            if (legacy.lessonId === lesson.id && !localStorage.getItem(lessonDraftKey(lesson.id))) {
              localStorage.setItem(lessonDraftKey(lesson.id), JSON.stringify(legacy));
            }
            if (legacy.lessonId === lesson.id || legacy.pendingSubmission?.lessonId === lesson.id) localStorage.removeItem(DRAFT_KEY);
          } catch { localStorage.removeItem(DRAFT_KEY); }
        }
        const saved = readLessonDraft(lesson.id);
        if (saved) {
          setDictationStarted(true);
          const savedCurrent = Math.min(saved.current, Math.max(0, data.sentences.length - 1));
          setAnswers(saved.answers);
          setDictationCurrent(savedCurrent);
          setHintCounts(saved.hintCounts);
          setTranscriptUsed(saved.transcriptUsed);
          setScores(saved.scores);
          setMode(saved.mode);
          setHasCompleted(saved.isCompleted === true);
          setCompletionScore(saved.isCompleted === true && Number.isFinite(saved.totalScore)
            ? saved.totalScore!
            : saved.isCompleted === true
              ? Math.round(Object.values(saved.scores).reduce((sum, score) => sum + score.accuracy, 0) / Math.max(Object.keys(saved.scores).length, 1))
              : null);
          setHintLevel(saved.hintCounts[data.sentences[savedCurrent]?.id] ?? 0);
        }
        const shadowingSaved = readShadowingDraft(lesson.id);
        if (shadowingSaved) {
          setShadowingCurrent(Math.min(shadowingSaved.current, Math.max(0, data.sentences.length - 1)));
          setShadowingScores(shadowingSaved.scores);
          setShadowingSources(shadowingSaved.sources ?? {});
          setShadowingLessonCompleted(shadowingSaved.isCompleted === true);
          setShadowingStarted(true);
        }
        if (sentenceToOpenId && practiceModeRef.current === 'SHADOWING') {
          const targetIndex = data.sentences.findIndex((item) => item.id === sentenceToOpenId);
          if (targetIndex >= 0) setShadowingCurrent(targetIndex);
        }
        setSavedDrafts(readLessonDrafts());
        setSavedShadowingDrafts(readShadowingDrafts());
        setDraftReady(true);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          isLeavingLessonRef.current = true;
          openedFromLibraryRef.current = false;
          activeLessonIdRef.current = null;
          setLesson(null);
          setLoginPrompt(true);
          router.replace(`/practice/dictation?mode=${practiceModeRef.current.toLowerCase()}`);
          return;
        }
        setError(e.message || 'Không tải được nội dung bài.');
      });
    return () => { cancelled = true; };
  }, [lesson, router, sentenceToOpenId]);

  useEffect(() => {
    if (!lesson) return;
    const syncDraft = async () => {
      try {
        const legacyRaw = localStorage.getItem(DRAFT_KEY);
        if (legacyRaw) {
          try {
            const legacy = JSON.parse(legacyRaw) as { pendingSubmission?: { lessonId?: string; answers?: Submission[] } };
            if (legacy.pendingSubmission?.lessonId === lesson.id) {
              localStorage.setItem(PENDING_KEY, JSON.stringify(legacy.pendingSubmission));
              localStorage.removeItem(DRAFT_KEY);
            }
          } catch { localStorage.removeItem(DRAFT_KEY); }
        }
        const raw = localStorage.getItem(PENDING_KEY);
        if (!raw) return;
        const pending = JSON.parse(raw) as { lessonId: string; answers: Submission[] };
        if (pending.lessonId !== lesson.id) return;
        const result = await apiFetch<{ overallScore?: number; results?: Array<{ sentenceId: string; accuracyScore: number; wer: number; diff: Array<{ reference: string; submitted: string; operation: string }> }> }>('/practice/dictation/submit', { method: 'POST', body: JSON.stringify(pending) });
        if (localStorage.getItem(PENDING_KEY) !== raw) return;
        const totalScore = Number.isFinite(result.overallScore) ? result.overallScore! : 0;
        const previous = readLessonDraft(lesson.id) ?? latestDraftRef.current;
        const resultScores = Object.fromEntries((result.results ?? []).map((item) => [item.sentenceId, {
          accuracy: item.accuracyScore,
          wer: item.wer,
          tokens: item.diff.map((token) => ({
            reference: token.reference,
            submitted: token.submitted,
            kind: token.operation === 'MATCH' ? 'correct' : token.operation.toLowerCase() as DictationScore['tokens'][number]['kind'],
          })),
        }]));
        const completedDraft: LessonDraft = previous ? {
          ...previous, scores: Object.keys(resultScores).length ? resultScores : previous.scores,
          isCompleted: true, totalScore, savedAt: new Date().toISOString(),
        } : {
          lessonId: lesson.id,
          answers: Object.fromEntries(pending.answers.map((item) => [item.sentenceId, item.textInput])),
          current: 0,
          hintCounts: Object.fromEntries(pending.answers.map((item) => [item.sentenceId, item.hintCount])),
          transcriptUsed: Object.fromEntries(pending.answers.map((item) => [item.sentenceId, item.usedTranscriptHint])),
          scores: resultScores,
          mode: 'FULL', savedAt: new Date().toISOString(), isCompleted: true, totalScore,
        };
        localStorage.removeItem(PENDING_KEY);
        localStorage.setItem(lessonDraftKey(lesson.id), JSON.stringify(completedDraft));
        setSavedDrafts(readLessonDrafts());
        setRecentLesson(lesson.id, 'COMPLETED', 'DICTATION');
        if (!isLeavingLessonRef.current && activeLessonIdRef.current === lesson.id) {
          latestDraftRef.current = completedDraft;
          setHasCompleted(true);
          setCompletionScore(totalScore);
          setCompletionSyncPending(false);
        }
      } catch { /* Giữ nguyên bản nháp để đồng bộ lại ở sự kiện online tiếp theo. */ }
    };
    window.addEventListener('online', syncDraft);
    void syncDraft();
    return () => window.removeEventListener('online', syncDraft);
  }, [lesson]);

  const recentLibraryItems = useMemo(() => {
    const progressByMode = new Map<string, LibraryProgress>();
    recentLessons.forEach((recent) => {
      const mode = recent.mode ?? 'DICTATION';
      progressByMode.set(`${recent.lessonId}:${mode}`, { lessonId: recent.lessonId, mode, lastOpenedAt: recent.lastOpenedAt, completedCount: 0, isCompleted: recent.status === 'COMPLETED' });
    });
    savedDrafts.forEach((draft) => progressByMode.set(`${draft.lessonId}:DICTATION`, { lessonId: draft.lessonId, mode: 'DICTATION', lastOpenedAt: draft.savedAt, completedCount: Object.keys(draft.scores).length, isCompleted: Boolean(draft.isCompleted), hasDraft: true, totalScore: draft.totalScore }));
    savedShadowingDrafts.forEach((draft) => progressByMode.set(`${draft.lessonId}:SHADOWING`, { lessonId: draft.lessonId, mode: 'SHADOWING', lastOpenedAt: draft.savedAt, completedCount: Object.keys(draft.scores).length, isCompleted: Boolean(draft.isCompleted), hasDraft: true, totalScore: draft.totalScore }));
    return Array.from(progressByMode.values())
      .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))
      .flatMap((progress) => {
        const item = lessons.find((candidate) => candidate.id === progress.lessonId);
        return item ? [{ progress, lesson: item }] : [];
      });
  }, [lessons, recentLessons, savedDrafts, savedShadowingDrafts]);
  const recentLibraryLessons = useMemo(() => {
    const lessonsById = new Map<string, RecentLibraryLesson>();
    recentLibraryItems.forEach(({ lesson: item, progress }) => {
      const existing = lessonsById.get(item.id);
      if (existing) {
        existing.progressByMode[progress.mode] = progress;
        if (progress.lastOpenedAt > existing.latestProgress.lastOpenedAt) existing.latestProgress = progress;
      } else {
        const progressByMode: Partial<Record<PracticeMode, LibraryProgress>> = {};
        progressByMode[progress.mode] = progress;
        lessonsById.set(item.id, { lesson: item, progressByMode, latestProgress: progress });
      }
    });
    return Array.from(lessonsById.values()).sort((a, b) => b.latestProgress.lastOpenedAt.localeCompare(a.latestProgress.lastOpenedAt));
  }, [recentLibraryItems]);
  const recentLessonIds = new Set(recentLibraryLessons.map(({ lesson: item }) => item.id));
  const visibleLessons = lessons.filter((item) => !recentLessonIds.has(item.id) && (!showFavorites || favorites.includes(item.id)) && (levelFilter === 'ALL' || item.level === levelFilter) && (mediaFilter === 'ALL' || (item.mediaType ?? 'AUDIO') === mediaFilter) && item.title.toLowerCase().includes(search.trim().toLowerCase()));
  const isYoutubeSource = customMediaType === 'VIDEO' && Boolean(youtubeId(youtubeUrl));
  function toggleFavorite(id: string) { setFavorites((old) => { const next = old.includes(id) ? old.filter((value) => value !== id) : [...old, id]; localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); return next; }); }
  async function createCustomLesson() {
    if (importing) return;
    if (!hasLoginToken()) { setLoginPrompt(true); return; }

    let isPremium = false;
    try {
      const raw = localStorage.getItem('student_profile');
      if (raw) {
        const u = JSON.parse(raw);
        isPremium = u?.role === 'PREMIUM_STUDENT' || u?.role === 'ADMIN' || u?.isPremium === true;
      }
    } catch {}
    if (!isPremium) isPremium = localStorage.getItem('shadowtation_tier') === 'PREMIUM';

    const customCount = lessons.filter((item) => Boolean(item.isCustom)).length;
    if (!isPremium && customCount >= 2) {
      setLockedLesson({
        id: 'premium-custom-limit',
        title: 'Tài khoản Miễn phí chỉ được tự tạo tối đa 2 bài học từ YouTube/Podcast riêng',
      } as Lesson);
      return;
    }

    setImporting(true);
    setYoutubeError('');
    try {
      const response = await apiFetch<{ item: Lesson }>('/practice/dictation/custom', {
        method: 'POST',
        body: JSON.stringify({ mediaUrl: youtubeUrl.trim(), mediaType: customMediaType, title: youtubeTitle.trim(), level: customLevel, captionsVtt, useYouTubeCaptions: isYoutubeSource && useYoutubeCaptions }),
      });
      setLessons((currentLessons) => [response.item, ...currentLessons.filter((item) => item.id !== response.item.id)]);
      setYoutubeUrl('');
      setYoutubeTitle('');
      setCaptionsVtt('');
      setYoutubeError('');
      beginLesson(response.item);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setLoginPrompt(true);
        setYoutubeError('');
      } else {
        setYoutubeError((error as Error).message || 'Could not add the lesson. Check the URL, captions, and connection.');
      }
    } finally {
      setImporting(false);
    }
  }

  const sentence = sentences[current];
  const shadowingSentence = sentences[shadowingCurrent];
  const answer = sentence ? (answers[sentence.id] ?? '') : '';
  useEffect(() => { setMediaTime(sentence?.startTime ?? 0); }, [sentence?.id, sentence?.startTime]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedAnswer(answer), 150);
    return () => window.clearTimeout(timer);
  }, [answer, sentence?.id]);
  const liveScore = useMemo(() => sentence?.textContent?.trim() ? compareDictation(sentence.textContent, debouncedAnswer) : null, [sentence, debouncedAnswer]);
  const completedCount = practiceMode === 'SHADOWING' ? Object.keys(shadowingScores).length : Object.keys(scores).length;
  const average = practiceMode === 'SHADOWING'
    ? (completedCount ? Math.round(Object.values(shadowingScores).reduce((sum, score) => sum + score, 0) / completedCount) : 0)
    : (completedCount ? Math.round(Object.values(scores).reduce((sum, score) => sum + score.accuracy, 0) / completedCount) : 0);
  const shadowingComplete = sentences.length > 0 && sentences.every((item) => shadowingScores[item.id] !== undefined);
  const shadowingRemaining = Math.max(0, sentences.length - Object.keys(shadowingScores).length);
  const dictationComplete = sentences.length > 0 && sentences.every((item) => scores[item.id] !== undefined);
  const dictationRemaining = Math.max(0, sentences.length - Object.keys(scores).length);
  const karaokeWordIndex = sentence ? (() => {
    const timedIndex = sentence.wordsJson.findIndex((word) => mediaTime >= word.start && mediaTime < word.end);
    if (timedIndex >= 0) return timedIndex;
    const wordCount = sentence.textContent.trim().split(/\s+/).filter(Boolean).length;
    const duration = sentence.endTime - sentence.startTime;
    return wordCount && duration > 0 ? Math.min(wordCount - 1, Math.max(0, Math.floor((mediaTime - sentence.startTime) / duration * wordCount))) : -1;
  })() : -1;
  function onShadowingCompleted(sentenceId: string, score: number, source: ShadowingSource) {
    const nextScores = { ...shadowingScores, [sentenceId]: score };
    const nextSources = { ...shadowingSources, [sentenceId]: source };
    setShadowingScores(nextScores);
    setShadowingSources(nextSources);
    if (!lesson) return;
    const draft: ShadowingDraft = { lessonId: lesson.id, current: shadowingCurrent, scores: nextScores, sources: nextSources, savedAt: new Date().toISOString(), isCompleted: false, totalScore: null };
    try { localStorage.setItem(shadowingDraftKey(lesson.id), JSON.stringify(draft)); } catch { setError('Không thể tự lưu tiến trình Shadowing trên thiết bị này.'); }
    setSavedShadowingDrafts(readShadowingDrafts());
    setRecentLesson(lesson.id, 'IN_PROGRESS', 'SHADOWING');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('shadowtation:progress-updated'));
    }
  }

  function onShadowingScoreReset(sentenceId: string) {
    if (!lesson || shadowingScores[sentenceId] === undefined) return;
    setError('');
    const nextScores = { ...shadowingScores };
    const nextSources = { ...shadowingSources };
    delete nextScores[sentenceId];
    delete nextSources[sentenceId];
    setShadowingScores(nextScores);
    setShadowingSources(nextSources);
    setShadowingLessonCompleted(false);
    const draft: ShadowingDraft = { lessonId: lesson.id, current: shadowingCurrent, scores: nextScores, sources: nextSources, savedAt: new Date().toISOString(), isCompleted: false, totalScore: null };
    latestShadowingDraftRef.current = draft;
    try { localStorage.setItem(shadowingDraftKey(lesson.id), JSON.stringify(draft)); }
    catch { setError('Không thể tự lưu tiến trình Shadowing trên thiết bị này.'); }
    setSavedShadowingDrafts(readShadowingDrafts());
    setRecentLesson(lesson.id, 'IN_PROGRESS', 'SHADOWING');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('shadowtation:progress-updated'));
    }
  }

  function finishShadowingLesson() {
    if (!lesson || !sentences.length) return;
    setError('');
    const firstUnscored = sentences.findIndex((item) => shadowingScores[item.id] === undefined);
    if (firstUnscored >= 0) {
      setShadowingCurrent(firstUnscored);
      setError(`Còn ${sentences.filter((item) => shadowingScores[item.id] === undefined).length} câu chưa được chấm. Hãy ghi âm và gửi từng câu trước khi hoàn thành bài.`);
      return;
    }
    const totalScore = Math.round(Object.values(shadowingScores).reduce((sum, value) => sum + value, 0) / sentences.length);
    const draft: ShadowingDraft = { lessonId: lesson.id, current: shadowingCurrent, scores: shadowingScores, sources: shadowingSources, savedAt: new Date().toISOString(), isCompleted: true, totalScore };
    setShadowingLessonCompleted(true);
    latestShadowingDraftRef.current = draft;
    try { localStorage.setItem(shadowingDraftKey(lesson.id), JSON.stringify(draft)); }
    catch { setError('Không thể tự lưu điểm tổng Shadowing trên thiết bị này.'); }
    setSavedShadowingDrafts(readShadowingDrafts());
    setRecentLesson(lesson.id, 'COMPLETED', 'SHADOWING');
    setCompletionScore(totalScore);
    setCompletionSyncPending(false);
    setFinished(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('shadowtation:progress-updated'));
    }
  }
  const activeDraft = useMemo<LessonDraft | null>(() => lesson && sentences.length && draftReady && dictationStarted && !finished ? {
    lessonId: lesson.id, answers, current: dictationCurrent, hintCounts, transcriptUsed, scores, mode, savedAt: new Date().toISOString(),
    isCompleted: hasCompleted, totalScore: hasCompleted ? completionScore : null,
  } : null, [lesson, sentences.length, draftReady, dictationStarted, finished, answers, dictationCurrent, hintCounts, transcriptUsed, scores, mode, hasCompleted, completionScore]);
  latestDraftRef.current = activeDraft;
  const activeShadowingDraft = useMemo<ShadowingDraft | null>(() => lesson && sentences.length && draftReady && shadowingStarted ? {
    lessonId: lesson.id, current: shadowingCurrent, scores: shadowingScores, sources: shadowingSources, savedAt: new Date().toISOString(),
    isCompleted: shadowingLessonCompleted,
    totalScore: shadowingLessonCompleted ? Math.round(Object.values(shadowingScores).reduce((sum, value) => sum + value, 0) / Math.max(Object.keys(shadowingScores).length, 1)) : null,
  } : null, [lesson, sentences, draftReady, shadowingStarted, shadowingCurrent, shadowingScores, shadowingSources, shadowingLessonCompleted]);
  latestShadowingDraftRef.current = activeShadowingDraft;

  useEffect(() => {
    if (!activeDraft) return;
    try {
      localStorage.setItem(lessonDraftKey(activeDraft.lessonId), JSON.stringify(activeDraft));
      setSavedDrafts(readLessonDrafts());
    } catch { setError('Không thể tự lưu tiến trình trên thiết bị này. Hãy kiểm tra dung lượng lưu trữ trình duyệt.'); }
  }, [activeDraft]);

  useEffect(() => {
    if (!activeShadowingDraft || practiceMode !== 'SHADOWING') return;
    try {
      localStorage.setItem(shadowingDraftKey(activeShadowingDraft.lessonId), JSON.stringify(activeShadowingDraft));
      setSavedShadowingDrafts(readShadowingDrafts());
      setRecentLesson(activeShadowingDraft.lessonId, activeShadowingDraft.isCompleted ? 'COMPLETED' : 'IN_PROGRESS', 'SHADOWING');
    } catch { setError('Không thể tự lưu tiến trình Shadowing trên thiết bị này.'); }
  }, [activeShadowingDraft, practiceMode]);

  useEffect(() => {
    const persistOnPageExit = () => {
      const dictationDraft = latestDraftRef.current;
      const shadowingDraft = latestShadowingDraftRef.current;
      try {
        if (dictationDraft) localStorage.setItem(lessonDraftKey(dictationDraft.lessonId), JSON.stringify(dictationDraft));
        if (shadowingDraft) localStorage.setItem(shadowingDraftKey(shadowingDraft.lessonId), JSON.stringify(shadowingDraft));
      } catch { /* The regular autosave already reported storage errors. */ }
    };
    window.addEventListener('pagehide', persistOnPageExit);
    window.addEventListener('beforeunload', persistOnPageExit);
    return () => {
      persistOnPageExit();
      window.removeEventListener('pagehide', persistOnPageExit);
      window.removeEventListener('beforeunload', persistOnPageExit);
    };
  }, []);

  function saveAnswer(value: string) {
    if (!sentence || !lesson || sending) return;
    invalidateCompletedResult();
    const next = { ...answers, [sentence.id]: value };
    setAnswers(next);
    setError('');
    setScores((old) => { if (!(sentence.id in old)) return old; const copy = { ...old }; delete copy[sentence.id]; return copy; });
  }

  function nextHint() {
    if (!sentence || hintLevel >= 3 || scores[sentence.id]) return;
    setHintLevel((level) => {
      const next = Math.min(3, level + 1);
      if (sentence) setHintCounts((old) => ({ ...old, [sentence.id]: next }));
      return next;
    });
  }

  function toggleTranscript() {
    if (!sentence || (!transcriptOn && scores[sentence.id])) return;
    setTranscriptOn((visible) => {
      if (!visible) setTranscriptUsed((old) => ({ ...old, [sentence.id]: true }));
      return !visible;
    });
  }

  function confirmSentence() {
    if (!sentence || sending) return;
    if (!answer.trim()) { setError('Nhập câu trả lời trước khi xác nhận câu này.'); return; }
    invalidateCompletedResult();
    const currentScore = compareDictation(sentence.textContent, answer);
    const penalty = hintPenalty(hintLevel, hintPenalties);
    setScores((old) => ({ ...old, [sentence.id]: { ...currentScore, accuracy: Math.max(0, currentScore.accuracy - penalty) } }));
    setError('');
  }

  function retrySentence() {
    if (!sentence || sending) return;
    invalidateCompletedResult();
    const next = { ...answers, [sentence.id]: '' };
    setAnswers(next);
    setScores((old) => { const copy = { ...old }; delete copy[sentence.id]; return copy; });
    setHintCounts((old) => { const copy = { ...old }; delete copy[sentence.id]; return copy; });
    setTranscriptUsed((old) => { const copy = { ...old }; delete copy[sentence.id]; return copy; });
    setTranscriptOn(false);
    setFillReset((version) => version + 1);
    setHintLevel(0);
  }

  function invalidateCompletedResult() {
    if (!hasCompleted) return;
    setHasCompleted(false);
    setCompletionScore(null);
    setCompletionSyncPending(false);
    if (!lesson) return;
    const pendingRaw = localStorage.getItem(PENDING_KEY);
    if (!pendingRaw) return;
    try {
      const pending = JSON.parse(pendingRaw) as { lessonId?: string };
      if (pending.lessonId === lesson.id) localStorage.removeItem(PENDING_KEY);
    } catch { localStorage.removeItem(PENDING_KEY); }
  }

  function persistCompletedResult(totalScore: number) {
    if (!lesson) return;
    const completedDraft: LessonDraft = {
      lessonId: lesson.id, answers, current: dictationCurrent, hintCounts, transcriptUsed, scores, mode,
      savedAt: new Date().toISOString(), isCompleted: true, totalScore,
    };
    latestDraftRef.current = completedDraft;
    setHasCompleted(true);
    setCompletionScore(totalScore);
    setRecentLesson(lesson.id, 'COMPLETED', 'DICTATION');
    try {
      localStorage.setItem(lessonDraftKey(lesson.id), JSON.stringify(completedDraft));
      setSavedDrafts(readLessonDrafts());
    } catch {
      setError('Điểm đã tính nhưng không thể lưu vào trình duyệt. Hãy kiểm tra dung lượng lưu trữ.');
    }
  }

  function updateStoredCompletedScore(lessonId: string, totalScore: number) {
    const previous = readLessonDraft(lessonId);
    if (!previous) return;
    const completedDraft = { ...previous, isCompleted: true, totalScore, savedAt: new Date().toISOString() };
    try {
      localStorage.setItem(lessonDraftKey(lessonId), JSON.stringify(completedDraft));
      setSavedDrafts(readLessonDrafts());
    } catch { /* The local score was already saved before the request. */ }
  }

  async function finishLesson() {
    if (!lesson || sending) return;
    const firstUnconfirmed = sentences.findIndex((item) => !scores[item.id]);
    if (firstUnconfirmed >= 0) {
      setCurrent(firstUnconfirmed);
      setHintLevel(hintCounts[sentences[firstUnconfirmed]?.id] ?? 0);
      setError(`Còn ${sentences.filter((item) => !scores[item.id]).length} câu chưa được xác nhận. Hãy kiểm tra và xác nhận từng câu trước khi nhận điểm tổng.`);
      return;
    }
    setSending(true);
    setError('');
    const submittedLessonId = lesson.id;
    try {
      const submissions: Submission[] = sentences.map((item) => ({
        sentenceId: item.id,
        textInput: answers[item.id] ?? '',
        hintCount: hintCounts[item.id] ?? 0,
        usedTranscriptHint: Boolean(transcriptUsed[item.id]),
      }));
      const localTotalScore = average;
      localStorage.setItem(PENDING_KEY, JSON.stringify({ lessonId: lesson.id, answers: submissions }));
      persistCompletedResult(localTotalScore);
      const result = await apiFetch<{ overallScore?: number }>('/practice/dictation/submit', {
        method: 'POST',
        body: JSON.stringify({ lessonId: lesson.id, answers: submissions }),
      });
      const pendingRaw = localStorage.getItem(PENDING_KEY);
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw) as { lessonId?: string };
          if (pending.lessonId === submittedLessonId) localStorage.removeItem(PENDING_KEY);
        } catch { localStorage.removeItem(PENDING_KEY); }
      }
      const finalScore = Number.isFinite(result.overallScore) ? result.overallScore! : localTotalScore;
      if (!isLeavingLessonRef.current && activeLessonIdRef.current === submittedLessonId) {
        persistCompletedResult(finalScore);
        setCompletionSyncPending(false);
        if (practiceModeRef.current === 'DICTATION') setFinished(true);
      } else {
        updateStoredCompletedScore(submittedLessonId, finalScore);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('shadowtation:progress-updated'));
      }
    } catch (e) {
      if (!isLeavingLessonRef.current && activeLessonIdRef.current === submittedLessonId) {
        if (e instanceof ApiError && e.status === 401) setLoginPrompt(true);
        setCompletionSyncPending(true);
        if (practiceModeRef.current === 'DICTATION') {
          setError(`Điểm tạm thời đã lưu trên thiết bị; kết quả sẽ tự đồng bộ khi kết nối được máy chủ. ${(e as Error).message}`);
          setFinished(true);
        }
      }
    } finally { setSending(false); }
  }

  function persistModeDraft(requestedMode: PracticeMode) {
    if (!lesson || !sentences.length || !draftReady) return;
    try {
      if (requestedMode === 'DICTATION') {
        if (!dictationStarted) return;
        const draft: LessonDraft = { lessonId: lesson.id, answers, current: dictationCurrent, hintCounts, transcriptUsed, scores, mode, savedAt: new Date().toISOString(), isCompleted: hasCompleted, totalScore: hasCompleted ? completionScore : null };
        latestDraftRef.current = draft;
        localStorage.setItem(lessonDraftKey(lesson.id), JSON.stringify(draft));
        setSavedDrafts(readLessonDrafts());
        setRecentLesson(lesson.id, draft.isCompleted ? 'COMPLETED' : 'IN_PROGRESS', requestedMode);
      } else {
        if (!shadowingStarted) return;
        const draft: ShadowingDraft = { lessonId: lesson.id, current: shadowingCurrent, scores: shadowingScores, sources: shadowingSources, savedAt: new Date().toISOString(), isCompleted: shadowingLessonCompleted, totalScore: shadowingLessonCompleted ? Math.round(Object.values(shadowingScores).reduce((sum, value) => sum + value, 0) / Math.max(Object.keys(shadowingScores).length, 1)) : null };
        latestShadowingDraftRef.current = draft;
        localStorage.setItem(shadowingDraftKey(lesson.id), JSON.stringify(draft));
        setSavedShadowingDrafts(readShadowingDrafts());
        setRecentLesson(lesson.id, draft.isCompleted ? 'COMPLETED' : 'IN_PROGRESS', requestedMode);
      }
    } catch {
      setError('Không thể tự lưu tiến trình trên thiết bị này. Hãy kiểm tra dung lượng lưu trữ trình duyệt.');
    }
  }

  function clearModeProgress(lessonId: string, requestedMode: PracticeMode) {
    if (requestedMode === 'SHADOWING') {
      localStorage.removeItem(shadowingDraftKey(lessonId));
      localStorage.removeItem(shadowingAttemptsKey(lessonId));
      return;
    }
    localStorage.removeItem(lessonDraftKey(lessonId));
    const pendingRaw = localStorage.getItem(PENDING_KEY);
    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw) as { lessonId?: string };
        if (pending.lessonId === lessonId) localStorage.removeItem(PENDING_KEY);
      } catch { localStorage.removeItem(PENDING_KEY); }
    }
    const legacyRaw = localStorage.getItem(DRAFT_KEY);
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw) as { lessonId?: string };
        if (legacy.lessonId === lessonId) localStorage.removeItem(DRAFT_KEY);
      } catch { localStorage.removeItem(DRAFT_KEY); }
    }
  }

  function persistLatestDraft() {
    persistModeDraft('DICTATION');
    persistModeDraft('SHADOWING');
  }

  function clearActiveLesson() {
    activeLessonIdRef.current = null;
    latestDraftRef.current = null;
    latestShadowingDraftRef.current = null;
    setLesson(null);
    setFinished(false);
    setHasCompleted(false);
    setCompletionScore(null);
    setCompletionSyncPending(false);
    setSentences([]);
    setScores({});
    setDictationStarted(false);
    setAnswers({});
    setHintCounts({});
    setTranscriptUsed({});
    setDictationCurrent(0);
    setShadowingCurrent(0);
    setShadowingScores({});
    setShadowingStarted(false);
    setHintLevel(0);
    setDraftReady(false);
  }

  function returnToLibrary() {
    persistLatestDraft();
    openedFromLibraryRef.current = false;
    isLeavingLessonRef.current = true;
    setLibraryView('AVAILABLE');
    setResumeSelection(null);
    router.replace(`/practice/dictation?mode=${practiceMode.toLowerCase()}`);
    clearActiveLesson();
  }

  async function restartCurrentLesson() {
    if (!lesson) return;
    if (practiceMode === 'SHADOWING') {
      try { await clearShadowingRecordings(lesson.id); }
      catch { setError('Không xóa được bản ghi cũ trên thiết bị.'); return; }
      localStorage.removeItem(shadowingDraftKey(lesson.id));
      localStorage.removeItem(shadowingAttemptsKey(lesson.id));
      latestShadowingDraftRef.current = null;
      setShadowingScores({});
      setShadowingCurrent(0);
      setShadowingStarted(true);
      setCompletionScore(null);
      setCompletionSyncPending(false);
      setDraftReady(true);
      setFinished(false);
      setRecentLesson(lesson.id, 'IN_PROGRESS', 'SHADOWING');
      setSavedShadowingDrafts(readShadowingDrafts());
      return;
    }
    localStorage.removeItem(lessonDraftKey(lesson.id));
    latestDraftRef.current = null;
    const pendingRaw = localStorage.getItem(PENDING_KEY);
    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw) as { lessonId?: string };
        if (pending.lessonId === lesson.id) localStorage.removeItem(PENDING_KEY);
      } catch { localStorage.removeItem(PENDING_KEY); }
    }
    setAnswers({});
    setDictationCurrent(0);
    setDictationStarted(true);
    setHintLevel(0);
    setHintCounts({});
    setTranscriptOn(false);
    setTranscriptUsed({});
    setScores({});
    setMode('FULL');
    setHasCompleted(false);
    setCompletionScore(null);
    setCompletionSyncPending(false);
    setDraftReady(true);
    setFinished(false);
    setRecentLesson(lesson.id, 'IN_PROGRESS', 'DICTATION');
    setSavedDrafts(readLessonDrafts());
  }

  function selectSentence(index: number) {
    setCurrent(index);
    if (practiceMode === 'DICTATION') setHintLevel(hintCounts[sentences[index]?.id] ?? 0);
    setTranscriptOn(false);
    setError('');
  }

  function seekToTimeAndSelectSentence(time: number) {
    if (!sentences.length) return time;
    let index = sentences.findIndex((item) => time >= item.startTime && time < item.endTime);
    let targetTime = time;
    if (index < 0) {
      const nextIndex = sentences.findIndex((item) => item.startTime > time);
      if (nextIndex >= 0) {
        index = nextIndex;
        targetTime = sentences[nextIndex].startTime;
      } else {
        index = sentences.length - 1;
        targetTime = Math.max(sentences[index].startTime, sentences[index].endTime - 0.05);
      }
    }
    if (index !== current) selectSentence(index);
    return targetTime;
  }

  function goBackFromLibrary() {
    router.replace('/');
  }

  useEffect(() => {
    if (!lesson) return;
    const handleBackNavigation = () => {
      if (isLeavingLessonRef.current) return;
      persistLatestDraft();
      isLeavingLessonRef.current = true;
      openedFromLibraryRef.current = false;
      setLibraryView('AVAILABLE');
      clearActiveLesson();
    };
    window.addEventListener('popstate', handleBackNavigation);
    return () => window.removeEventListener('popstate', handleBackNavigation);
  }, [lesson]);

  useEffect(() => {
    if (!lesson || finished) return;
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const isTyping = Boolean(target?.closest('input, textarea, select, [contenteditable="true"]'));
      const isControl = Boolean(target?.closest('button, a, [role="button"]'));
      if (event.repeat) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        returnToLibrary();
        return;
      }
      if (isTyping) return;

      // Phím tắt Shadowing: Bấm phím mũi tên trái/phải để quay lại câu trước hoặc sang câu tiếp theo
      if (practiceMode === 'SHADOWING') {
        if (event.key === 'ArrowLeft' || (event.altKey && event.key === 'ArrowLeft')) {
          event.preventDefault();
          selectSentence(Math.max(0, current - 1));
          return;
        }
        if (event.key === 'ArrowRight' || (event.altKey && event.key === 'ArrowRight')) {
          event.preventDefault();
          selectSentence(Math.min(sentences.length - 1, current + 1));
          return;
        }
        return;
      }

      if (practiceMode !== 'DICTATION') return;
      if (isControl || event.metaKey || event.ctrlKey) return;
      if (event.altKey) {
        const shortcut = event.key.toLowerCase();
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          selectSentence(Math.max(0, Math.min(sentences.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1))));
        } else if (shortcut === 'm') {
          event.preventDefault();
          document.querySelector<HTMLButtonElement>('.media-play-button')?.click();
        } else if (shortcut === 'r') {
          event.preventDefault();
          document.querySelector<HTMLButtonElement>('.media-replay-button')?.click();
        } else if (shortcut === 't') {
          event.preventDefault();
          retrySentence();
        } else if (shortcut === 'g') {
          event.preventDefault();
          nextHint();
        } else if (shortcut === 'p') {
          event.preventDefault();
          toggleTranscript();
        } else return;
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        confirmSentence();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [lesson, finished, current, sentences, answers, scores, hintLevel, hintCounts, transcriptUsed, transcriptOn, practiceMode]);

  if (loading) return <main className="dictation-screen min-h-screen bg-slate-50 dark:bg-slate-950 p-8 text-slate-600 dark:text-slate-300">Đang tải bài học…</main>;
  if (!lesson) return (
    <main className="dictation-screen min-h-screen bg-slate-50 dark:bg-slate-950 px-5 py-12 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <button type="button" onClick={goBackFromLibrary} className="dictation-back-link">
            {t('dictation.back_home')}
          </button>
          <div className="practice-method-tabs" role="tablist" aria-label="Tabs">
            <button
              type="button"
              role="tab"
              aria-selected={practiceMode === 'DICTATION'}
              onClick={() => changePracticeMode('DICTATION')}
              className={practiceMode === 'DICTATION' ? 'method-active font-bold' : 'font-semibold'}
            >
              🎧 {t('dictation.tab_dictation')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={practiceMode === 'SHADOWING'}
              onClick={() => changePracticeMode('SHADOWING')}
              className={practiceMode === 'SHADOWING' ? 'method-active font-bold' : 'font-semibold'}
            >
              🎙️ {t('dictation.tab_shadowing')}
            </button>
          </div>
        </div>
        <header className="mb-10">
          
          <p className="text-sm font-bold uppercase tracking-[.2em] text-blue-600 dark:text-blue-400">
            Shadowtation · {practiceMode === 'SHADOWING' ? t('dictation.tab_shadowing') : t('dictation.tab_dictation')}
          </p>
          <h1 className="mt-3 text-4xl font-extrabold text-slate-900 dark:text-slate-100">
            {practiceMode === 'SHADOWING'
              ? (lang === 'en' ? 'Select Speaking Lesson' : 'Chọn bài luyện nói')
              : (lang === 'en' ? 'Select Listening Lesson' : 'Chọn bài luyện nghe')}
          </h1>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
            {practiceMode === 'SHADOWING'
              ? (lang === 'en' ? 'Listen to model audio, record your voice, and see accurate AI pronunciation results.' : 'Nghe câu mẫu, ghi âm giọng nói và xem kết quả chấm phát âm chuẩn xác.')
              : (lang === 'en' ? 'Listen sentence by sentence, transcribe, and receive live error feedback.' : 'Nghe từng câu, chép lại và nhận phản hồi lỗi sai ngay khi nhập.')}
          </p>
        </header>

        {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-base font-semibold text-rose-700 dark:text-rose-300">{error}</p>}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-2.5" role="tablist" aria-label="Library tabs">
            <button
              type="button"
              role="tab"
              aria-selected={libraryView === 'AVAILABLE'}
              className={`library-tab-btn ${libraryView === 'AVAILABLE' ? 'active' : ''}`}
              onClick={() => setLibraryView('AVAILABLE')}
            >
              <span>{lang === 'en' ? 'Available Lessons' : 'Bài học có sẵn'}</span>
              <span className="count-badge">{visibleLessons.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={libraryView === 'RECENT'}
              className={`library-tab-btn ${libraryView === 'RECENT' ? 'active' : ''}`}
              onClick={() => setLibraryView('RECENT')}
            >
              <span>{lang === 'en' ? 'In Progress & Recent' : 'Đang học & Gần đây'}</span>
              <span className="count-badge">{recentLibraryLessons.length}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              role="tab"
              aria-selected={libraryView === 'CUSTOM'}
              className={`library-action-btn ${libraryView === 'CUSTOM' ? 'active' : ''}`}
              onClick={() => setLibraryView('CUSTOM')}
            >
              <Plus aria-hidden="true" size={17} />
              <span>{lang === 'en' ? 'Import custom lesson' : 'Thêm bài học riêng'}</span>
            </button>
            <Link
              href={`/practice/vocabulary-review?mode=${practiceMode.toLowerCase()}`}
              className="library-action-btn"
            >
              <span>📖 {lang === 'en' ? 'Review Vocabulary' : 'Ôn tập từ vựng'}</span>
            </Link>
          </div>
        </div>

        {libraryView === 'AVAILABLE' && <>
        <div className="dictation-library-tools">
          <div className="library-search" role="search"><Search aria-hidden="true" size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('dictation.search_placeholder')} aria-label="Search" />{search && <button type="button" className="search-clear" aria-label="Clear" onClick={() => setSearch('')}><X size={17} /></button>}</div>
          <select aria-label="Level filter" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}><option value="ALL">{t('dictation.filter_all_levels')}</option><option value="BEGINNER">{lang === 'en' ? 'A1–A2 · Beginner' : 'A1–A2 · Cơ bản'}</option><option value="INTERMEDIATE">{lang === 'en' ? 'B1–B2 · Intermediate' : 'B1–B2 · Trung cấp'}</option><option value="ADVANCED">{lang === 'en' ? 'C1–C2 · Advanced' : 'C1–C2 · Nâng cao'}</option></select>
          <select aria-label="Media filter" value={mediaFilter} onChange={(event) => setMediaFilter(event.target.value)}><option value="ALL">{t('dictation.filter_all_media')}</option><option value="AUDIO">Audio</option><option value="VIDEO">Video</option><option value="PODCAST">Podcast</option></select>
          <button onClick={() => setShowFavorites((value) => !value)} className={showFavorites ? 'library-filter active' : 'library-filter'}>{showFavorites ? (lang === 'en' ? '♥ Viewing Favorites' : '♥ Đang xem yêu thích') : (lang === 'en' ? '♡ Favorites' : '♡ Yêu thích')}</button>
        </div>
        </>}
        {libraryView === 'RECENT' && (recentLibraryLessons.length > 0 ? <section className="dictation-recent-section" aria-labelledby="recent-lessons-title">
          <h2 id="recent-lessons-title" className="library-section-title">Bài đang luyện dở &amp; học gần đây <span>{recentLibraryLessons.length}</span></h2>
          <div className="dictation-library-grid">
            {recentLibraryLessons.map(({ lesson: item, progressByMode }) => {
              const activeProgress = progressByMode[practiceMode];
              const hasActiveDraft = Boolean(activeProgress?.hasDraft);
              return <article key={`recent-${item.id}`} className="dictation-lesson-card recent-lesson-card">
                <button onClick={() => beginLesson(item, true, true, practiceMode)} className="lesson-select">
                  <div className="lesson-badges">
                    <span className={`recent-status-badge ${activeProgress?.isCompleted ? 'completed' : hasActiveDraft ? 'in-progress' : ''}`}>{activeProgress?.isCompleted ? 'Đã hoàn thành' : hasActiveDraft ? 'Đang luyện dở' : 'Đã mở gần đây'}</span>
                    <span className={`media-type-badge media-type-${(item.mediaType ?? 'AUDIO').toLowerCase()}`}>{mediaTypeLabel(item.mediaType)}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-500">{formatDuration(item.durationSeconds)} · {item.sentenceCount} câu</p>
                  
                  {/* Chỉ hiển thị tiến độ và điểm số của chế độ đang chọn, không trùng lặp */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {practiceMode === 'DICTATION' && progressByMode.DICTATION && (
                      <span className="media-type-badge font-semibold">
                        Luyện nghe · {progressByMode.DICTATION.completedCount}/{item.sentenceCount} câu
                      </span>
                    )}
                    {practiceMode === 'SHADOWING' && progressByMode.SHADOWING && (
                      <span className="media-type-badge font-semibold">
                        Luyện nói · {progressByMode.SHADOWING.completedCount}/{item.sentenceCount} câu
                      </span>
                    )}
                  </div>
                  {activeProgress?.isCompleted && typeof activeProgress.totalScore === 'number' && (
                    <p className="mt-2 text-sm font-bold text-blue-700">
                      Điểm tổng {practiceMode === 'SHADOWING' ? 'Luyện nói' : 'Luyện nghe'}: {activeProgress.totalScore}/100
                    </p>
                  )}
                  <span className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                    {hasActiveDraft ? 'Tiếp tục luyện tập →' : (practiceMode === 'SHADOWING' ? 'Luyện nói →' : 'Luyện nghe →')}
                  </span>
                </button>
              </article>;
            })}
          </div>
        </section> : <div className="library-empty recent-empty">Chưa có bài đang luyện dở hoặc học gần đây.</div>)}
        {libraryView === 'AVAILABLE' && <>
        <h2 className="library-section-title">Bài học có sẵn <span>{visibleLessons.length}</span></h2>
        <div className="dictation-library-grid">
        {visibleLessons.map((item) => <article key={item.id} className="dictation-lesson-card"><button aria-label={favorites.includes(item.id) ? 'Bỏ yêu thích' : 'Thêm yêu thích'} title={favorites.includes(item.id) ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'} className="lesson-heart" onClick={() => toggleFavorite(item.id)}>{favorites.includes(item.id) ? '♥' : '♡'}</button><button onClick={() => beginLesson(item, true, false, practiceMode)} className="lesson-select">
            <div className="lesson-badges"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{item.level}</span><span className={`media-type-badge media-type-${(item.mediaType ?? 'AUDIO').toLowerCase()}`}>{mediaTypeLabel(item.mediaType)}</span>{item.access === 'LOCKED' ? <span className="premium-badge">🔒 Mở khóa Premium</span> : item.isPremiumOnly && <span className="premium-badge">✦ Premium</span>}</div>
            <h2 className="mt-5 text-xl font-bold">{item.title}</h2><p className="mt-2 text-sm text-slate-500">{formatDuration(item.durationSeconds)} · {item.sentenceCount} câu · Có transcript tiếng Anh</p><p className="lesson-source-name">Nguồn: {item.sourceName || 'Bài học có sẵn'}</p>
            <span className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{practiceMode === 'SHADOWING' ? 'Luyện nói →' : 'Luyện nghe →'}</span>
          </button></article>)}
          {!visibleLessons.length && <div className="library-empty">{lessons.length ? 'Không có bài học phù hợp bộ lọc.' : 'Chưa có bài học được xuất bản.'}</div>}
        </div>
        </>}
        {libraryView === 'CUSTOM' && <section className="youtube-import">
          <div>
            <p className="library-kicker">NGUỒN CỦA BẠN</p>
            <h2>Thêm bài học của riêng bạn</h2>
            <p>Dán liên kết nội dung bạn muốn luyện. Với video YouTube, hệ thống có thể lấy phụ đề tiếng Anh công khai tự động; nguồn audio hoặc podcast khác cần phụ đề WebVTT có timestamp.</p>
            <div className="youtube-form mt-6 flex flex-col gap-4">
              <input aria-label="Tên bài học" value={youtubeTitle} onChange={(event) => setYoutubeTitle(event.target.value)} placeholder="Tên bài học (không bắt buộc)" className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500" />
              <input aria-label="URL media" value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=... hoặc URL audio" className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500" />
              <div className="custom-lesson-options grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col text-sm font-semibold text-slate-700">Loại nguồn<select value={customMediaType} onChange={(event) => setCustomMediaType(event.target.value as 'AUDIO' | 'VIDEO' | 'PODCAST')} className="mt-1 rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-500"><option value="VIDEO">Video YouTube</option><option value="AUDIO">Audio</option><option value="PODCAST">Podcast</option></select></label>
                <label className="flex flex-col text-sm font-semibold text-slate-700">Trình độ<select value={customLevel} onChange={(event) => setCustomLevel(event.target.value)} className="mt-1 rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-500"><option value="BEGINNER">A1–A2 · Cơ bản</option><option value="INTERMEDIATE">B1–B2 · Trung cấp</option><option value="ADVANCED">C1–C2 · Nâng cao</option></select></label>
              </div>
              {isYoutubeSource && <div className="youtube-caption-toggle"><label htmlFor="youtube-auto-captions"><input id="youtube-auto-captions" type="checkbox" checked={useYoutubeCaptions} onChange={(event) => setUseYoutubeCaptions(event.target.checked)} /><span><strong>Tự lấy phụ đề tiếng Anh từ YouTube</strong><small>Nếu video có phụ đề công khai, bạn có thể bật transcript trong lúc luyện. Không tải video hay tách âm thanh.</small></span></label>{useYoutubeCaptions && <p>Không thấy phụ đề tự động? Tắt tùy chọn này để tải tệp WebVTT có timestamp.</p>}</div>}
              {(!isYoutubeSource || !useYoutubeCaptions) && <>
                <label htmlFor="custom-vtt-file" className="text-sm font-semibold text-slate-700">Chọn tệp phụ đề .vtt</label>
                <input id="custom-vtt-file" type="file" accept=".vtt,text/vtt" onChange={async (event) => { const file = event.target.files?.[0]; if (file) setCaptionsVtt(await file.text()); }} className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100" />
                <label htmlFor="custom-captions" className="text-sm font-semibold text-slate-700">Hoặc dán phụ đề WebVTT có mốc thời gian</label>
                <textarea id="custom-captions" aria-label="Phụ đề WebVTT có timestamp" value={captionsVtt} onChange={(event) => setCaptionsVtt(event.target.value)} placeholder={'WEBVTT\n\n00:00:00.500 --> 00:00:03.200\nWelcome to our English lesson.\n\n00:00:03.500 --> 00:00:06.800\nToday we are going to talk about daily habits.'} rows={6} className="w-full rounded-xl border border-slate-300 p-3 font-mono text-sm outline-none focus:border-blue-500" />
                <p className="caption-help text-xs text-slate-500">Cần phụ đề WebVTT có timestamp để chia câu và chấm bài. Chỉ tải phụ đề bạn sở hữu hoặc được phép sử dụng.</p>
              </>}
              <button onClick={createCustomLesson} disabled={importing} className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">{importing ? 'Đang xử lý phụ đề…' : 'Thêm bài học / Tự học'}</button>
              {youtubeError && <p role="alert" className="text-sm text-rose-600">{youtubeError}</p>}
            </div>
          </div>
        </section>}
      </div>
      {resumeSelection && <ResumeLessonDialog lessonTitle={resumeSelection.lesson.title} savedAt={resumeSelection.progress.lastOpenedAt} confirmedCount={resumeSelection.progress.completedCount} totalScore={resumeSelection.progress.isCompleted ? resumeSelection.progress.totalScore : null} onContinue={resumeSavedLesson} onRestart={restartSavedLesson} />}
      {lockedLesson && <PremiumRequiredDialog lessonTitle={lockedLesson.title} onClose={() => setLockedLesson(null)} />}
      {loginPrompt && <LoginRequiredDialog onClose={() => setLoginPrompt(false)} />}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border-2 border-emerald-400 bg-emerald-600 px-5 py-3.5 text-base font-bold text-white shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-black text-emerald-700">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </main>
  );

  if (finished) return <main className="dictation-screen completion-screen grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950 p-6"><section className="completion-card w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center shadow-xl md:p-10"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-3xl text-emerald-700 dark:text-emerald-400">✓</div><h1 className="mt-5 text-3xl font-bold text-slate-900 dark:text-slate-100">{t('dictation.completed_title')}</h1><p className="mt-2 text-slate-500 dark:text-slate-400">{lesson.title}</p><p className="mt-8 text-6xl font-black text-blue-600 dark:text-blue-400">{completionScore ?? average}<span className="text-2xl">/100</span></p><p className="mt-2 text-slate-500 dark:text-slate-400">{lang === 'en' ? `Total score · ${practiceMode === 'SHADOWING' ? 'Speaking' : 'Listening'} · ${completedCount}/${sentences.length} sentences assessed` : `Điểm tổng ${practiceMode === 'SHADOWING' ? 'Luyện nói' : 'Luyện nghe'} · ${completedCount}/${sentences.length} ${practiceMode === 'SHADOWING' ? 'câu đã chấm phát âm' : 'câu đã xác nhận'}`}</p><div className="completion-progress" role="progressbar" aria-label="Progress" aria-valuenow={sentences.length ? Math.round(completedCount / sentences.length * 100) : 0} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${sentences.length ? completedCount / sentences.length * 100 : 0}%` }} /></div>{completionSyncPending && <p role="status" className="completion-sync-note">{lang === 'en' ? 'Scores saved locally; will sync with server when connection is restored.' : 'Điểm và tiến trình đã lưu trên thiết bị; sẽ đồng bộ với máy chủ khi kết nối được khôi phục.'}</p>}{error && <p role="alert" className="completion-sync-note">{error}</p>}<div className="completion-actions"><button type="button" onClick={restartCurrentLesson}>{t('dictation.redo_start')}</button><button type="button" onClick={returnToLibrary}>{t('dictation.pick_another')}</button><button type="button" onClick={() => setFinished(false)}>{t('dictation.continue_edit')}</button></div>{loginPrompt && <LoginRequiredDialog onClose={() => setLoginPrompt(false)} />}</section></main>;

  return (
    <main className="dictation-screen min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4"><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={returnToLibrary} className="dictation-back-link">{t('dictation.back_library')}</button><button type="button" onClick={returnToLibrary} className="dictation-exit-button">{t('dictation.exit_lesson')}</button><Link href={practiceMode === 'DICTATION' ? '/practice/dictation/results' : '/practice/shadowing/results'} className="dictation-exit-button inline-flex items-center justify-center text-center">{practiceMode === 'DICTATION' ? t('dictation.view_history_dictation') : t('dictation.view_history_shadowing')}</Link></div><div className="text-right"><p className="font-bold text-slate-900 dark:text-slate-100">{lesson.title}</p><p className="text-xs text-slate-500 dark:text-slate-400">{lesson.level}</p></div></div></header>
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"><div className="flex justify-between text-sm"><span className="font-bold text-slate-900 dark:text-slate-100">{t('dictation.progress')}</span><span className="text-slate-600 dark:text-slate-400">{completedCount}/{sentences.length} {t('dictation.sentences_count')}</span></div><div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${sentences.length ? completedCount / sentences.length * 100 : 0}%` }} /></div><nav className="mt-5 grid grid-cols-5 gap-2 lg:grid-cols-3">{sentences.map((item, i) => <button key={item.id} onClick={() => selectSentence(i)} aria-label={`${t('dictation.sentence')} ${i + 1}`} className={`h-10 rounded-lg text-sm font-bold ${current === i ? 'bg-blue-600 text-white' : (practiceMode === 'SHADOWING' ? shadowingScores[item.id] !== undefined : Boolean(scores[item.id])) ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{i + 1}</button>)}</nav>{practiceMode === 'DICTATION' && hasCompleted && typeof completionScore === 'number' && <div className="mt-6 rounded-xl bg-blue-50 dark:bg-blue-950/40 p-4 border border-blue-200 dark:border-blue-900/60"><p className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">{t('dictation.saved_total')}</p><p className="mt-1 text-3xl font-black text-blue-800 dark:text-blue-200">{completionScore}/100</p></div>}{practiceMode === 'SHADOWING' && shadowingLessonCompleted && completedCount > 0 && <div className="mt-6 rounded-xl bg-blue-50 dark:bg-blue-950/40 p-4 border border-blue-200 dark:border-blue-900/60"><p className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">{t('dictation.saved_total')}</p><p className="mt-1 text-3xl font-black text-blue-800 dark:text-blue-200">{average}/100</p></div>}</aside>
        <section className="dictation-workbench min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm md:p-8">
          {error && <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
          {!sentence ? <div className="py-12 text-center text-slate-600">{error ? <><p>{error}</p><button type="button" onClick={returnToLibrary} className="dictation-back-link mt-5">{t('dictation.back_library')}</button></> : (lang === 'en' ? 'Loading lesson content…' : 'Đang tải nội dung bài học…')}</div> : <>
            <div className="dictation-practice-heading"><div><p className="text-sm font-semibold text-blue-600">{t('dictation.sentence')} {current + 1} / {sentences.length}</p><h1>{practiceMode === 'SHADOWING' ? t('dictation.heading_shadowing') : t('dictation.heading_dictation')}</h1></div>{practiceMode === 'DICTATION' && <div className="dictation-mode-switch"><button onClick={() => setMode('FULL')} aria-pressed={mode === 'FULL'} className={mode === 'FULL' ? 'active' : ''}>{t('dictation.mode_full')}</button><button onClick={() => setMode('BLANKS')} aria-pressed={mode === 'BLANKS'} className={mode === 'BLANKS' ? 'active' : ''}>{t('dictation.mode_blanks')}</button></div>}</div>
            <MediaDictationPlayer key={`${lesson.id}-shared-audio`} mediaType={lesson.mediaType ?? 'AUDIO'} mediaUrl={lesson.mediaType === 'VIDEO' ? (lesson.sourceUrl ?? lesson.audioUrl) : lesson.audioUrl} title={lesson.title} startTime={sentence.startTime} endTime={sentence.endTime} onSeekToTime={lesson.mediaType === 'VIDEO' ? undefined : seekToTimeAndSelectSentence} onTimeUpdate={setMediaTime} disableArrowSeek={practiceMode === 'SHADOWING'} />
            {practiceMode === 'DICTATION' ? <>
              <div className="dictation-shortcuts" aria-label="Shortcuts"><strong>{t('shadowing.shortcuts')}</strong><span><kbd>Alt</kbd>+<kbd>M</kbd> play / pause</span><span><kbd>Alt</kbd>+<kbd>R</kbd> replay</span><span><kbd>Alt</kbd>+<kbd>T</kbd> retry</span><span><kbd>Alt</kbd>+<kbd>G</kbd> hint</span><span><kbd>Alt</kbd>+<kbd>P</kbd> transcript</span><span><kbd>Alt</kbd>+<kbd>←</kbd>/<kbd>→</kbd> prev / next</span>{lesson.mediaType !== 'VIDEO' && <><span><kbd>←</kbd>/<kbd>→</kbd> ±5s</span><span><kbd>M</kbd> mute</span></>}<span><kbd>Ctrl</kbd>+<kbd>Enter</kbd> confirm</span><span><kbd>Esc</kbd> catalog</span></div>
              <div className="dictation-controls"><button onClick={nextHint} disabled={hintLevel >= 3 || Boolean(scores[sentence.id])} className="hint-action">✦ {t('dictation.hint')} {hintLevel ? `(${hintLevel}/3 · −${hintPenalty(hintLevel, hintPenalties)}đ)` : ''}</button><button disabled={!transcriptOn && Boolean(scores[sentence.id])} onClick={toggleTranscript} className={`transcript-action ${transcriptOn ? 'active' : ''}`}>{transcriptOn ? t('dictation.hide_transcript') : t('dictation.show_transcript')}</button><button onClick={retrySentence}>{t('dictation.retry_sentence')}</button><span>{t('dictation.hint_warning')}</span></div>
              {hintLevel > 0 && <div className="dictation-hint-card"><p>Hint level {hintLevel}</p><p>{maskedHint(sentence.textContent, hintLevel)}</p></div>}
              {transcriptOn && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Transcript</p><p className="mt-1 text-amber-950">{sentence.textContent}</p></div>}
              <label htmlFor="dictation-answer" className="dictation-answer-label">{t('dictation.your_answer')}</label>
              {mode === 'FULL' ? <textarea id="dictation-answer" value={answer} onChange={(event) => saveAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); confirmSentence(); } }} placeholder={t('dictation.placeholder_type')} rows={4} className="dictation-answer-input" /> : <FillBlanks key={`${sentence.id}-${fillReset}`} text={sentence.textContent} value={answer} onChange={saveAnswer} onConfirm={confirmSentence} />}
              <div className="dictation-live-feedback"><span>{t('dictation.live_feedback')}</span>{liveScore && <span className="live-accuracy">{t('dictation.current_accuracy')} {liveScore.accuracy}%</span>}</div>
              {scores[sentence.id] && <div className="dictation-confirmed-result"><p>{t('dictation.confirmed_sentence')} · {scores[sentence.id].accuracy}%</p></div>}
              <div className="dictation-navigation">
                <button
                  type="button"
                  onClick={() => selectSentence(current - 1)}
                  disabled={current === 0}
                  className="prev-sentence-button"
                >
                  {t('dictation.prev_btn')}
                </button>
                <div>
                  <button
                    type="button"
                    onClick={confirmSentence}
                    className="confirm-answer-button"
                  >
                    {t('dictation.confirm_btn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => selectSentence(current + 1)}
                    disabled={current === sentences.length - 1}
                    className="next-sentence-button"
                  >
                    {t('dictation.next_btn')}
                  </button>
                </div>
              </div>

              <div className="shadowing-completion-action mt-6">
                <button
                  type="button"
                  onClick={finishLesson}
                  disabled={sending || !dictationComplete}
                >
                  {sending ? t('dictation.saving') : t('dictation.finish_lesson_listening')}
                </button>
                {!dictationComplete && (
                  <p>
                    {lang === 'en'
                      ? `${dictationRemaining} ${t('dictation.remaining_note')}`
                      : `Còn ${dictationRemaining} ${t('dictation.remaining_note')}`}
                  </p>
                )}
              </div>
            </> : shadowingSentence && <>
              <ShadowingPractice key={lesson.id} lessonId={lesson.id} sentence={shadowingSentence} activeWordIndex={karaokeWordIndex} isActive onCompleted={onShadowingCompleted} onScoreReset={onShadowingScoreReset} />
              
              {/* Shadowing Navigation Bar */}
              <div className="dictation-navigation">
                <button
                  type="button"
                  onClick={() => selectSentence(current - 1)}
                  disabled={current === 0}
                  className="prev-sentence-button"
                >
                  {t('dictation.prev_btn')}
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => selectSentence(current + 1)}
                    disabled={current === sentences.length - 1}
                    className="next-sentence-button"
                  >
                    {t('dictation.next_btn')}
                  </button>
                </div>
              </div>

              <div className="shadowing-completion-action mt-6">
                <button
                  type="button"
                  onClick={finishShadowingLesson}
                  disabled={!shadowingComplete}
                >
                  {t('shadowing.finish_lesson')}
                </button>
                {!shadowingComplete && (
                  <p>
                    {lang === 'en'
                      ? `${shadowingRemaining} ${t('shadowing.remaining_note')}`
                      : `Còn ${shadowingRemaining} ${t('shadowing.remaining_note')}`}
                  </p>
                )}
              </div>
            </>}
          </>}
        </section>
      </div>
      {loginPrompt && <LoginRequiredDialog onClose={() => setLoginPrompt(false)} />}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 rounded-2xl border-2 border-emerald-400 bg-white/95 backdrop-blur-md px-5 py-4 text-slate-800 shadow-2xl shadow-emerald-500/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-lg font-black text-white shadow-md">
            ✓
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">Shadowtation</p>
            <p className="text-base font-bold text-slate-800">{toastMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 font-bold p-1"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<main className="dictation-shell flex min-h-screen items-center justify-center"><p className="text-slate-600">Đang tải bài học...</p></main>}>
      <DictationPracticeInner />
    </Suspense>
  );
}

function LoginRequiredDialog({ onClose }: { onClose: () => void }) {
  return <div role="presentation" className="dictation-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="login-required-title" className="dictation-modal"><div className="dictation-modal-icon login-icon" aria-hidden="true">↗</div><p className="dictation-modal-eyebrow">Tài khoản học viên</p><h2 id="login-required-title">Đăng nhập để tiếp tục</h2><p className="dictation-modal-copy">Đăng nhập để bắt đầu bài học, lưu tiến độ và thêm nguồn nghe của riêng bạn.</p><div className="dictation-modal-actions"><button type="button" onClick={onClose} className="dictation-secondary-button">Để sau</button><Link href="/login" className="dictation-primary-button">Đăng nhập</Link></div></section></div>;
}

function ResumeLessonDialog({ lessonTitle, savedAt, confirmedCount, totalScore, onContinue, onRestart }: { lessonTitle: string; savedAt: string; confirmedCount: number; totalScore: number | null | undefined; onContinue: () => void; onRestart: () => void }) {
  return <div role="presentation" className="dictation-modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="resume-lesson-title" className="dictation-modal resume-lesson-modal"><div className="dictation-modal-icon" aria-hidden="true">↻</div><p className="dictation-modal-eyebrow">Đã tìm thấy tiến trình</p><h2 id="resume-lesson-title">Bạn muốn học tiếp thế nào?</h2><p className="dictation-modal-copy"><strong>{lessonTitle}</strong><br />Đã chấm {confirmedCount} câu{typeof totalScore === 'number' ? ` · Điểm tổng ${totalScore}/100` : ''}<br />Lưu lần cuối {new Date(savedAt).toLocaleString()}.</p><div className="dictation-modal-actions"><button type="button" onClick={onContinue} className="dictation-primary-button">Tiếp tục với tiến trình đã lưu</button><button type="button" onClick={onRestart} className="dictation-secondary-button">Làm lại từ đầu</button></div></section></div>;
}

function PremiumRequiredDialog({ lessonTitle, onClose }: { lessonTitle: string; onClose: () => void }) {
  return <div role="presentation" className="dictation-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="premium-required-title" className="dictation-modal"><div className="dictation-modal-icon premium-icon" aria-hidden="true">★</div><p className="dictation-modal-eyebrow premium-eyebrow">Bài học Premium</p><h2 id="premium-required-title">Mở khóa bài học</h2><p className="dictation-modal-copy"><strong>{lessonTitle}</strong> nằm trong thư viện Premium. Chọn gói học để tiếp tục luyện tập bài này.</p><div className="dictation-modal-actions"><button type="button" onClick={onClose} className="dictation-secondary-button">Để sau</button><Link href="/subscription" className="dictation-primary-button premium-button">Xem gói học</Link></div></section></div>;
}

function FillBlanks({ text, value, onChange, onConfirm }: { text: string; value: string; onChange: (value: string) => void; onConfirm: () => void }) {
  const words = text.split(/\s+/);
  const slots = words.map((word, index) => index % 2 === 1);
  const existing = value ? value.split(/\s+/) : [];
  const [slotValues, setSlotValues] = useState<Record<number, string>>(() => Object.fromEntries(words.map((_, index) => [index, slots[index] ? existing[index] ?? '' : ''])));
  return <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-slate-300 p-4">{words.map((word, index) => slots[index] ? <input key={index} aria-label={`Từ còn thiếu ${Math.floor(index / 2) + 1}`} value={slotValues[index] ?? ''} onKeyDown={(event) => { if (event.key !== 'Enter') return; event.preventDefault(); if (event.ctrlKey || event.metaKey) onConfirm(); else { const inputs = Array.from(event.currentTarget.parentElement?.querySelectorAll('input') ?? []); inputs[inputs.indexOf(event.currentTarget) + 1]?.focus(); } }} onChange={(event) => { const nextSlots = { ...slotValues, [index]: event.target.value }; setSlotValues(nextSlots); const complete = words.every((_, i) => !slots[i] || (nextSlots[i] ?? '').trim()); onChange(complete ? words.map((item, i) => slots[i] ? nextSlots[i] : item).join(' ') : ''); }} className="w-28 rounded border-b-2 border-indigo-400 bg-indigo-50 px-2 py-1 outline-none focus:border-indigo-700" /> : <span key={index}>{word}</span>)}</div>;
}

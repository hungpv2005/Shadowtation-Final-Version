'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { addWordToPersonalDictionary } from '@/app/review-list-page';
import { useLanguage } from '@/lib/i18n';

export type VocabItem = {
  id: string;
  word: string;
  source: 'DICTATION' | 'SHADOWING';
  sentence?: string | null;
  lessonTitle?: string | null;
  hintTip?: string;
  isStarred?: boolean;
};

const DEFAULT_VOCAB_ITEMS: VocabItem[] = [
  {
    id: 'vocab-1',
    word: 'listening',
    source: 'DICTATION',
    sentence: 'Active listening is the key to mastering English communication.',
    hintTip: 'Phát âm rõ 2 âm tiết: LIS-ten-ing, âm /t/ là âm câm.',
    isStarred: false,
  },
  {
    id: 'vocab-2',
    word: 'pronunciation',
    source: 'SHADOWING',
    sentence: 'Your pronunciation improves significantly with daily speaking practice.',
    hintTip: 'Nhấn trọng âm ở âm tiết thứ tư: pro-nun-ci-A-tion.',
    isStarred: false,
  },
  {
    id: 'vocab-3',
    word: 'comprehension',
    source: 'DICTATION',
    sentence: 'Listening comprehension requires patience and consistent practice.',
    hintTip: 'Chú ý trọng âm rơi vào âm tiết: com-pre-HEN-sion.',
    isStarred: false,
  },
  {
    id: 'vocab-4',
    word: 'intonation',
    source: 'SHADOWING',
    sentence: 'Pay close attention to rising and falling intonation in the audio.',
    hintTip: 'Nhấn trọng âm ở âm tiết thứ ba: in-to-NA-tion, lên giọng ở cuối câu hỏi.',
    isStarred: false,
  },
  {
    id: 'vocab-5',
    word: 'vocabulary',
    source: 'DICTATION',
    sentence: 'Learning vocabulary in complete sentences helps you remember longer.',
    hintTip: 'Trọng âm rơi vào âm tiết thứ hai: vo-CAB-u-lar-y.',
    isStarred: false,
  },
  {
    id: 'vocab-6',
    word: 'fluency',
    source: 'SHADOWING',
    sentence: 'Shadowing technique allows learners to speak with natural fluency.',
    hintTip: 'Âm đầu /fl/ mượt mà, trọng âm đầu: FLU-en-cy.',
    isStarred: false,
  },
];

const VOCAB_STORAGE_KEY = 'shadowtation.vocab_review_items';

export function VocabularyReviewSection({
  practiceMode,
  onBackToLibrary,
  onToast,
}: {
  practiceMode: 'DICTATION' | 'SHADOWING';
  onBackToLibrary: () => void;
  onToast: (msg: string) => void;
}) {
  const { lang } = useLanguage();
  const [items, setItems] = useState<VocabItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'DICTATION' | 'SHADOWING'>('ALL');
  const [search, setSearch] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Dictation mode state
  const [typedAnswer, setTypedAnswer] = useState('');
  const [typingFeedback, setTypingFeedback] = useState<{ kind: 'correct' | 'incorrect'; message: string; hintChars?: string } | null>(null);

  // Shadowing mode state
  const [isRecording, setIsRecording] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [speakingFeedback, setSpeakingFeedback] = useState<{ kind: 'correct' | 'incorrect'; message: string; advice?: string } | null>(null);

  // Word list visual controls: eye (hidden/blurred) state
  const [blurredWordIds, setBlurredWordIds] = useState<Record<string, boolean>>({});
  const [allBlurred, setAllBlurred] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Load items from backend and/or local storage
  useEffect(() => {
    let active = true;
    const loadSaved = () => {
      try {
        const localRaw = localStorage.getItem(VOCAB_STORAGE_KEY);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
      return DEFAULT_VOCAB_ITEMS;
    };

    const initial = loadSaved();
    setItems(initial);

    apiFetch<{ items: Array<{ id: string; word: string; source: 'DICTATION' | 'SHADOWING' | 'LEGACY'; sentence?: string | null; lessonTitle?: string | null }> }>('/users/review-list')
      .then((data) => {
        if (!active || !data.items || !data.items.length) return;
        const mapped: VocabItem[] = data.items.map((it) => ({
          id: it.id,
          word: it.word,
          source: it.source === 'SHADOWING' ? 'SHADOWING' : 'DICTATION',
          sentence: it.sentence || `Luyện từ ${it.word} trong bài học.`,
          lessonTitle: it.lessonTitle,
          hintTip: `Chú ý phát âm rõ âm đuôi và nhấn đúng trọng âm của từ "${it.word}".`,
          isStarred: false,
        }));
        setItems((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const additions = mapped.filter((m) => !existingIds.has(m.id));
          const merged = [...prev, ...additions];
          try { localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(merged)); } catch {}
          return merged;
        });
      })
      .catch(() => {
        // Fallback to local items if API has error or user is not logged in
      });

    return () => {
      active = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  // Save changes to localStorage
  const updateItems = (next: VocabItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchFilter = filter === 'ALL' || item.source === filter;
      const matchSearch = !search.trim() || item.word.toLowerCase().includes(search.trim().toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [items, filter, search]);

  const currentItem: VocabItem | undefined = filteredItems[currentIndex] ?? filteredItems[0];

  useEffect(() => {
    if (currentIndex >= filteredItems.length && filteredItems.length > 0) {
      setCurrentIndex(0);
    }
    // Reset answers when changing current word
    setTypedAnswer('');
    setTypingFeedback(null);
    setSpokenTranscript('');
    setSpeakingFeedback(null);
  }, [currentIndex, filteredItems.length, currentItem?.id]);

  // Voice speech synthesis
  const speakCurrentWord = () => {
    if (!currentItem || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentItem.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  // Toggle star
  const toggleStar = () => {
    if (!currentItem) return;
    const nextStarred = !currentItem.isStarred;
    const next = items.map((it) => (it.id === currentItem.id ? { ...it, isStarred: nextStarred } : it));
    updateItems(next);
    onToast(nextStarred ? `Đã gắn sao lưu từ "${currentItem.word}". Từ này sẽ không tự động xóa!` : `Đã bỏ sao từ "${currentItem.word}".`);
  };

  // Add to personal dictionary
  const addToDictionary = () => {
    if (!currentItem) return;
    addWordToPersonalDictionary(
      currentItem.word,
      `Từ ôn tập ${currentItem.source === 'SHADOWING' ? 'Luyện nói' : 'Luyện nghe'}`,
      currentItem.sentence || '',
      currentItem.source === 'SHADOWING' ? 'Luyện nói' : 'Luyện nghe'
    );
    onToast('Đã thêm vào từ điển thành công!');
  };

  // Check typed answer (Dictation Mode)
  const handleCheckTyped = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentItem || !typedAnswer.trim()) return;

    const normalizedInput = typedAnswer.trim().toLowerCase().replace(/[^\w]/g, '');
    const normalizedTarget = currentItem.word.trim().toLowerCase().replace(/[^\w]/g, '');

    if (normalizedInput === normalizedTarget) {
      setTypingFeedback({
        kind: 'correct',
        message: 'Chính xác! Bạn đã chép đúng từ vừa nghe.',
      });
    } else {
      // Generate masked underscores according to word length: "_ _ _ _ _ _"
      const length = currentItem.word.length;
      const mask = Array.from({ length }, () => '_').join(' ');
      setTypingFeedback({
        kind: 'incorrect',
        message: 'Chưa chính xác.',
        hintChars: `Gợi ý số ký tự: ${mask} (${length} chữ cái)`,
      });
    }
  };

  // Speech recording (Shadowing Mode)
  const startRecording = () => {
    if (!currentItem) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback if browser doesn't support Web Speech API
      setIsRecording(true);
      setSpeakingFeedback(null);
      setTimeout(() => {
        setIsRecording(false);
        setSpokenTranscript(currentItem.word);
        setSpeakingFeedback({
          kind: 'correct',
          message: 'Chính xác! Bạn đã phát âm tốt từ vừa nghe.',
        });
      }, 1500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeakingFeedback(null);
        setSpokenTranscript('');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.trim().toLowerCase();
        setSpokenTranscript(transcript);
        const target = currentItem.word.toLowerCase();

        if (transcript.includes(target) || target.includes(transcript)) {
          setSpeakingFeedback({
            kind: 'correct',
            message: `Chính xác! Bạn đã phát âm chuẩn từ "${currentItem.word}".`,
          });
        } else {
          setSpeakingFeedback({
            kind: 'incorrect',
            message: 'Chưa chính xác.',
            advice: currentItem.hintTip || `Bạn vừa đọc: "${transcript}". Hãy chú ý phát âm rõ các âm tiết và âm đuôi của từ "${currentItem.word}".`,
          });
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
        setSpeakingFeedback({
          kind: 'incorrect',
          message: 'Chưa chính xác hoặc micro không rõ.',
          advice: currentItem.hintTip || `Hãy kiểm tra micro và phát âm to, rõ ràng từng âm tiết của từ "${currentItem.word}".`,
        });
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  // Retry current word
  const handleRetry = () => {
    setTypedAnswer('');
    setTypingFeedback(null);
    setSpokenTranscript('');
    setSpeakingFeedback(null);
  };

  // Next word (with auto-removal if passed and not starred)
  const handleNextWord = () => {
    if (!currentItem) return;
    const isPassed =
      (practiceMode === 'DICTATION' && typingFeedback?.kind === 'correct') ||
      (practiceMode === 'SHADOWING' && speakingFeedback?.kind === 'correct');

    if (isPassed && !currentItem.isStarred) {
      // Auto-remove word from review list
      const nextList = items.filter((it) => it.id !== currentItem.id);
      updateItems(nextList);
      onToast(`Từ "${currentItem.word}" đã hoàn thành và được gỡ khỏi danh sách ôn!`);
      // Keep index in range
      if (currentIndex >= nextList.length) {
        setCurrentIndex(Math.max(0, nextList.length - 1));
      }
    } else {
      if (currentIndex < filteredItems.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(0);
      }
    }
    setTypedAnswer('');
    setTypingFeedback(null);
    setSpokenTranscript('');
    setSpeakingFeedback(null);
  };

  const handlePrevWord = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(Math.max(0, filteredItems.length - 1));
    }
    setTypedAnswer('');
    setTypingFeedback(null);
    setSpokenTranscript('');
    setSpeakingFeedback(null);
  };

  // Delete word from list
  const handleDeleteWord = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextList = items.filter((it) => it.id !== id);
    updateItems(nextList);
    onToast('Đã xóa từ khỏi danh sách ôn tập.');
    if (currentIndex >= nextList.length) {
      setCurrentIndex(Math.max(0, nextList.length - 1));
    }
  };

  // Delete all words
  const handleDeleteAll = () => {
    if (window.confirm('Bạn có chắc muốn xóa tất cả từ trong danh sách ôn tập?')) {
      updateItems([]);
      onToast('Đã xóa tất cả từ vựng ôn tập.');
      setCurrentIndex(0);
    }
  };

  // Toggle eye (blur/hide) for one word
  const toggleBlurOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBlurredWordIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Toggle eye for all words
  const toggleBlurAll = () => {
    const nextState = !allBlurred;
    setAllBlurred(nextState);
    const newMap: Record<string, boolean> = {};
    items.forEach((it) => {
      newMap[it.id] = nextState;
    });
    setBlurredWordIds(newMap);
    onToast(nextState ? 'Đã làm mờ toàn bộ từ để bạn tự nhớ!' : 'Đã hiển thị toàn bộ từ vựng.');
  };

  // Keyboard shortcuts: Arrow keys, Tab, Space
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);

      if (e.key === 'ArrowRight' && !isInput) {
        e.preventDefault();
        handleNextWord();
      } else if (e.key === 'ArrowLeft' && !isInput) {
        e.preventDefault();
        handlePrevWord();
      } else if (e.key === 'Tab' && !isInput) {
        e.preventDefault();
        handleRetry();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        speakCurrentWord();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, filteredItems, typingFeedback, speakingFeedback, currentItem]);

  // Statistics counts
  const totalCount = items.length;
  const dictationCount = items.filter((it) => it.source === 'DICTATION').length;
  const shadowingCount = items.filter((it) => it.source === 'SHADOWING').length;

  return (
    <div className="vocab-review-section">
      {/* Nút quay lại danh sách bài theo chế độ tương ứng */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToLibrary}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-base font-bold text-slate-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
        >
          <span aria-hidden="true" className="text-lg">←</span>{' '}
          {lang === 'en'
            ? `Back to ${practiceMode === 'SHADOWING' ? 'Speaking' : 'Listening'} lessons`
            : `Quay lại danh sách bài ${practiceMode === 'SHADOWING' ? 'Luyện nói' : 'Luyện nghe'}`}
        </button>

        <span className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800">
          {lang === 'en'
            ? `Review mode: ${practiceMode === 'SHADOWING' ? 'Speaking (Pronunciation)' : 'Listening (Dictation)'}`
            : `Chế độ ôn tập: ${practiceMode === 'SHADOWING' ? 'Luyện nói (Phát âm)' : 'Luyện nghe (Gõ từ)'}`}
        </span>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 md:text-4xl">
          {lang === 'en' ? 'Vocabulary Review List' : 'Danh sách từ vựng ôn tập'}
        </h1>
        <p className="mt-2 text-base text-slate-600">
          {practiceMode === 'SHADOWING'
            ? (lang === 'en' ? 'Listen to vocabulary and record your pronunciation matching native samples.' : 'Nghe lại từ vựng và luyện ghi âm phát âm chuẩn xác theo từng câu mẫu.')
            : (lang === 'en' ? 'Listen to spoken words and transcribe them to sharpen your reflexes.' : 'Nghe lại từ phát âm và chép lại đúng từ vừa nghe để củng cố phản xạ.')}
        </p>
      </header>

      {/* 3 Ô thống kê tổng số từ */}
      <section className="mb-7 grid gap-4 sm:grid-cols-3" aria-label="Thống kê từ vựng ôn tập">
        <article className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 transition flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-slate-500">
              {lang === 'en' ? 'All review words' : 'Tất cả từ cần ôn'}
            </span>
            <strong className="mt-2 block text-3xl font-black text-slate-900">{totalCount}</strong>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-2xl font-bold text-blue-600">
            📚
          </span>
        </article>

        <article className="rounded-2xl border-2 border-sky-200 bg-white p-5 shadow-sm hover:border-sky-300 transition flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-sky-800">
              {lang === 'en' ? 'All words from Listening' : 'Tất cả từ trong Luyện nghe'}
            </span>
            <strong className="mt-2 block text-3xl font-black text-sky-700">{dictationCount}</strong>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-sky-50 text-2xl font-bold text-sky-600">
            ♫
          </span>
        </article>

        <article className="rounded-2xl border-2 border-violet-200 bg-white p-5 shadow-sm hover:border-violet-300 transition flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-violet-800">
              {lang === 'en' ? 'All words from Speaking' : 'Tất cả từ trong Luyện nói'}
            </span>
            <strong className="mt-2 block text-3xl font-black text-violet-700">{shadowingCount}</strong>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-violet-50 text-2xl font-bold text-violet-600">
            ◉
          </span>
        </article>
      </section>

      {/* Grid: Danh sách từ bên trái & Bảng luyện tập bên phải */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
        {/* Cột trái: Bộ lọc & Danh sách từ */}
        <aside className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            {/* Bộ lọc: Tất cả, Luyện nghe, Luyện nói */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: 'ALL', label: lang === 'en' ? 'All' : 'Tất cả' },
                { value: 'DICTATION', label: lang === 'en' ? 'Listening' : 'Luyện nghe' },
                { value: 'SHADOWING', label: lang === 'en' ? 'Speaking' : 'Luyện nói' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setFilter(tab.value as any);
                    setCurrentIndex(0);
                  }}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                    filter === tab.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Thanh tìm kiếm */}
            <div className="mt-3">
              <input
                type="text"
                placeholder={lang === 'en' ? 'Search vocabulary...' : 'Tìm từ ôn tập...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            {/* Tiêu đề danh sách, số từ & Nút con mắt ẩn/hiện tất cả */}
            <div className="mt-4 flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                {filteredItems.length} {lang === 'en' ? 'words showing' : 'từ hiển thị'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleBlurAll}
                  title={allBlurred ? (lang === 'en' ? 'Show all words' : 'Hiện tất cả từ') : (lang === 'en' ? 'Blur all words' : 'Làm mờ tất cả từ')}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition"
                >
                  <span>{allBlurred ? '👁️' : '👁️‍🗨️'}</span>
                  <span>{allBlurred ? (lang === 'en' ? 'Show all' : 'Hiện tất cả') : (lang === 'en' ? 'Blur all' : 'Ẩn tất cả')}</span>
                </button>
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAll}
                    title={lang === 'en' ? 'Delete all words in list' : 'Xóa tất cả từ trong danh sách'}
                    className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition text-xs"
                  >
                    🗑️ {lang === 'en' ? 'Clear all' : 'Xóa tất cả'}
                  </button>
                )}
              </div>
            </div>

            {/* Danh sách các từ */}
            <div className="mt-3 space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredItems.map((item, idx) => {
                const isSelected = currentItem?.id === item.id;
                const isBlurred = blurredWordIds[item.id] || allBlurred;

                return (
                  <div
                    key={item.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border-2 px-3.5 py-2.5 transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 shadow-sm'
                        : 'border-slate-100 bg-slate-50/60 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      {item.isStarred && <span className="text-amber-500 text-sm">⭐</span>}
                      <span
                        className={`text-sm font-bold transition-all ${
                          isSelected ? 'text-blue-900 font-black' : 'text-slate-800'
                        } ${isBlurred ? 'blur-sm select-none' : ''}`}
                      >
                        {item.word}
                      </span>
                      <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                        {item.source === 'SHADOWING' ? 'Nói' : 'Nghe'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Nút con mắt ẩn / hiện từ */}
                      <button
                        type="button"
                        onClick={(e) => toggleBlurOne(item.id, e)}
                        title={isBlurred ? 'Bỏ làm mờ từ này' : 'Làm mờ từ này'}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                      >
                        {isBlurred ? '👁️' : '👁️‍🗨️'}
                      </button>

                      {/* Nút xóa từ */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteWord(item.id, e)}
                        title="Xóa từ này"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}

              {!filteredItems.length && (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                  Không tìm thấy từ ôn tập phù hợp.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <strong>Phím tắt:</strong> <kbd>←</kbd>/<kbd>→</kbd> đổi câu · <kbd>Tab</kbd> làm lại · <kbd>Ctrl+Space</kbd> nghe từ.
          </div>
        </aside>

        {/* Cột phải: Không gian luyện từ (Luyện nghe hoặc Luyện nói) */}
        <section className="rounded-3xl border-2 border-slate-200 bg-white p-6 md:p-8 shadow-sm flex flex-col justify-between min-h-[500px]">
          {currentItem ? (
            <div>
              {/* Header câu ôn tập */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-800">
                      Từ {currentIndex + 1} / {filteredItems.length}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      Nguồn: {currentItem.source === 'SHADOWING' ? 'Luyện nói (Shadowing)' : 'Luyện nghe (Dictation)'}
                    </span>
                  </div>
                  <h2 className="mt-2 text-4xl font-black text-slate-900 tracking-tight">
                    {currentItem.word}
                  </h2>
                </div>

                {/* Các nút: Nghe từ, Sao ⭐, Thêm vào từ điển 📖 */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={speakCurrentWord}
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-2.5 text-base font-bold text-blue-700 shadow-sm transition hover:bg-blue-100"
                    title="Nghe lại phát âm từ này"
                  >
                    <span>🔊</span> Nghe từ
                  </button>

                  {/* Nút Ngôi sao ⭐ lưu lại từ */}
                  <button
                    type="button"
                    onClick={toggleStar}
                    className={`grid h-11 w-11 place-items-center rounded-xl border-2 transition text-lg ${
                      currentItem.isStarred
                        ? 'border-amber-400 bg-amber-50 text-amber-500 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-400 hover:border-amber-300 hover:text-amber-500'
                    }`}
                    title={currentItem.isStarred ? 'Đang gắn sao (không tự xóa khi qua câu)' : 'Gắn sao để giữ lại từ này'}
                  >
                    ⭐
                  </button>

                  {/* Nút Thêm vào từ điển cá nhân */}
                  <button
                    type="button"
                    onClick={addToDictionary}
                    className="inline-flex items-center gap-1.5 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-100"
                    title="Thêm từ này vào Sổ từ vựng cá nhân của bạn"
                  >
                    📖 Thêm vào từ điển
                  </button>
                </div>
              </div>

              {/* Ngữ cảnh câu */}
              {currentItem.sentence && (
                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-blue-700">Ngữ cảnh bài học</p>
                  <p className="mt-2 text-base font-semibold text-slate-800 leading-relaxed">
                    {currentItem.sentence}
                  </p>
                </div>
              )}

              {/* Nội dung thực hành: Tách biệt rõ ràng theo 2 chế độ */}
              <div className="mt-6">
                {practiceMode === 'DICTATION' ? (
                  /* Giao diện LUYỆN NGHE: Nghe lại từ và gõ lại đúng từ */
                  <form onSubmit={handleCheckTyped} className="space-y-4">
                    <label htmlFor="vocab-typed-input" className="block text-base font-bold text-slate-800">
                      Nhập từ vừa nghe:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        id="vocab-typed-input"
                        type="text"
                        autoComplete="off"
                        autoCapitalize="none"
                        value={typedAnswer}
                        onChange={(e) => setTypedAnswer(e.target.value)}
                        placeholder="Gõ chính xác từ tiếng Anh vừa nghe..."
                        className="flex-1 rounded-xl border-2 border-slate-300 px-4 py-3 text-lg font-bold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                      <button
                        type="submit"
                        disabled={!typedAnswer.trim()}
                        className="rounded-xl bg-blue-600 px-6 py-3 text-base font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        Kiểm tra
                      </button>
                    </div>

                    {/* Phản hồi khi gõ đúng hoặc sai */}
                    {typingFeedback && (
                      <div
                        className={`rounded-2xl border-2 p-4 text-base font-bold ${
                          typingFeedback.kind === 'correct'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-rose-300 bg-rose-50 text-rose-800'
                        }`}
                      >
                        <p>{typingFeedback.message}</p>
                        {typingFeedback.hintChars && (
                          <p className="mt-2 font-mono text-lg tracking-widest text-rose-900">
                            {typingFeedback.hintChars}
                          </p>
                        )}
                      </div>
                    )}
                  </form>
                ) : (
                  /* Giao diện LUYỆN NÓI: Nghe từ và nói ghi âm phát âm lại */
                  <div className="space-y-4">
                    <p className="text-base font-bold text-slate-800">Ghi âm phát âm từ vừa nghe:</p>
                    <div className="flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={startRecording}
                        disabled={isRecording}
                        className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base font-bold text-white shadow-lg transition ${
                          isRecording
                            ? 'bg-rose-600 animate-pulse'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                        }`}
                      >
                        <span className="text-xl">🎤</span>
                        <span>{isRecording ? 'Đang lắng nghe giọng bạn...' : 'Bắt đầu ghi âm nói'}</span>
                      </button>

                      {spokenTranscript && (
                        <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                          Giọng bạn nhận diện: <strong>"{spokenTranscript}"</strong>
                        </div>
                      )}
                    </div>

                    {/* Phản hồi khi phát âm chuẩn hoặc chưa chuẩn */}
                    {speakingFeedback && (
                      <div
                        className={`rounded-2xl border-2 p-4 text-base font-bold ${
                          speakingFeedback.kind === 'correct'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-amber-300 bg-amber-50 text-amber-900'
                        }`}
                      >
                        <p>{speakingFeedback.message}</p>
                        {speakingFeedback.advice && (
                          <p className="mt-1.5 text-sm font-medium text-amber-800 leading-relaxed">
                            💡 {speakingFeedback.advice}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid h-full place-items-center text-center text-slate-500">
              Chưa có từ nào trong danh sách.
            </div>
          )}

          {/* Hai nút điều khiển: "Từ trước" và "Từ tiếp theo" */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={handlePrevWord}
              disabled={currentIndex === 0}
              className="rounded-xl border-2 border-slate-200 bg-slate-50 px-5 py-2.5 text-base font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {lang === 'en' ? '← Previous word' : '← Từ trước'}
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-base font-bold text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 transition"
              >
                {lang === 'en' ? '↻ Retry' : '↻ Làm lại'}
              </button>

              <button
                type="button"
                onClick={handleNextWord}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-base font-bold text-white shadow-md hover:bg-blue-700 transition"
              >
                {lang === 'en' ? 'Next word →' : 'Từ tiếp theo →'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

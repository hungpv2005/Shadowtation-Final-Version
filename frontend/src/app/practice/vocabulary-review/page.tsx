'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
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

function VocabularyReviewContent() {
  const { lang } = useLanguage();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'shadowing' ? 'SHADOWING' : 'DICTATION';
  const backHref = `/practice/dictation?mode=${initialMode.toLowerCase()}`;

  const [items, setItems] = useState<VocabItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'DICTATION' | 'SHADOWING' | 'STARRED'>('ALL');
  const [search, setSearch] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Practice Console State
  const [practiceTab, setPracticeTab] = useState<'TYPING' | 'SPEAKING'>(
    initialMode === 'SHADOWING' ? 'SPEAKING' : 'TYPING'
  );
  const [typedAnswer, setTypedAnswer] = useState('');
  const [typingFeedback, setTypingFeedback] = useState<{ kind: 'correct' | 'incorrect'; message: string; hintChars?: string } | null>(null);

  // Audio Recording & Evaluation State
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);
  const [speakingFeedback, setSpeakingFeedback] = useState<{ kind: 'correct' | 'incorrect'; message: string; advice?: string } | null>(null);

  // Hidden/blurred words (Eye toggle) - default to true as requested
  const [allBlurred, setAllBlurred] = useState(true);
  const [blurredWordIds, setBlurredWordIds] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    DEFAULT_VOCAB_ITEMS.forEach((it) => {
      map[it.id] = true;
    });
    return map;
  });

  // Reveal toggle for console word when in Dictation mode (to avoid leaking answer)
  const [isWordRevealedInConsole, setIsWordRevealedInConsole] = useState(false);

  // Tracking whether current word was passed/mastered (typing or speaking)
  const [isWordMastered, setIsWordMastered] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Media & Recognition Refs
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const userAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3800);
  };

  // Load items from API and local storage
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
    // Initialize all items as blurred by default
    setBlurredWordIds((prev) => {
      const nextMap = { ...prev };
      initial.forEach((it: VocabItem) => {
        if (nextMap[it.id] === undefined) nextMap[it.id] = true;
      });
      return nextMap;
    });

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
          try {
            localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          // Ensure new items are also blurred by default
          setBlurredWordIds((bMap) => {
            const nextBMap = { ...bMap };
            merged.forEach((item) => {
              if (nextBMap[item.id] === undefined) nextBMap[item.id] = true;
            });
            return nextBMap;
          });
          return merged;
        });
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (userAudioPlayerRef.current) {
        userAudioPlayerRef.current.pause();
      }
    };
  }, []);

  const updateItems = (next: VocabItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchFilter =
        filter === 'ALL'
          ? true
          : filter === 'STARRED'
          ? item.isStarred
          : item.source === filter;
      const matchSearch = !search.trim() || item.word.toLowerCase().includes(search.trim().toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [items, filter, search]);

  const currentItem: VocabItem | undefined = filteredItems[currentIndex] ?? filteredItems[0];

  // Reset practice console states when changing target word or list length
  useEffect(() => {
    if (currentIndex >= filteredItems.length && filteredItems.length > 0) {
      setCurrentIndex(0);
    }
    setTypedAnswer('');
    setTypingFeedback(null);
    setSpokenTranscript('');
    setSpeakingFeedback(null);
    setIsRecording(false);
    setHasRecorded(false);
    setIsWordMastered(false);
    setIsWordRevealedInConsole(false);

    if (userAudioUrl) {
      URL.revokeObjectURL(userAudioUrl);
      setUserAudioUrl(null);
    }
    if (userAudioPlayerRef.current) {
      userAudioPlayerRef.current.pause();
      setIsPlayingUserAudio(false);
    }
  }, [currentIndex, filteredItems.length, currentItem?.id]);

  const speakWord = (word: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const toggleStar = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = items.map((it) => (it.id === id ? { ...it, isStarred: !it.isStarred } : it));
    updateItems(next);
    const target = items.find((it) => it.id === id);
    if (target) {
      const nowStarred = !target.isStarred;
      showToast(
        nowStarred
          ? (lang === 'en' ? `Starred "${target.word}" - will be preserved when reviewing!` : `Đã gắn sao từ "${target.word}" - sẽ lưu lại và không bị xóa khi ôn tập!`)
          : (lang === 'en' ? `Unstarred "${target.word}".` : `Đã bỏ dấu sao từ "${target.word}".`)
      );
    }
  };

  const toggleWordBlur = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBlurredWordIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleAllBlur = () => {
    const nextState = !allBlurred;
    setAllBlurred(nextState);
    const updated: Record<string, boolean> = {};
    items.forEach((it) => {
      updated[it.id] = nextState;
    });
    setBlurredWordIds(updated);
  };

  const handleDeleteItem = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = items.filter((it) => it.id !== id);
    updateItems(next);
    apiFetch(`/users/review-list/${id}`, { method: 'DELETE' }).catch(() => undefined);
    showToast(lang === 'en' ? 'Removed word from review list.' : 'Đã xóa từ khỏi danh sách ôn tập.');
  };

  const handleClearAll = () => {
    if (!window.confirm(lang === 'en' ? 'Are you sure you want to clear all review items?' : 'Bạn có chắc chắn muốn xóa toàn bộ danh sách từ vựng ôn tập này không?')) return;
    updateItems([]);
    apiFetch('/users/review-list', { method: 'DELETE' }).catch(() => undefined);
    showToast(lang === 'en' ? 'Cleared all review vocabulary.' : 'Đã xóa toàn bộ từ vựng ôn tập.');
  };

  const handleAddToPersonalDict = (item: VocabItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    addWordToPersonalDictionary(
      item.word,
      `Từ cần ôn lại (${item.source === 'SHADOWING' ? 'Luyện nói' : 'Luyện nghe'})`,
      item.sentence || `Luyện tập từ "${item.word}" trong bài học.`,
      item.source === 'SHADOWING' ? 'Luyện nói' : 'Luyện nghe',
      'n',
    );
    showToast(lang === 'en' ? `Added "${item.word}" to Personal Notebook!` : `Đã thêm từ "${item.word}" vào Sổ từ vựng cá nhân!`);
  };

  // Dictation typing check
  const handleCheckTyped = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentItem || !typedAnswer.trim()) return;

    const normalizedInput = typedAnswer.trim().toLowerCase().replace(/[^\w]/g, '');
    const normalizedTarget = currentItem.word.trim().toLowerCase().replace(/[^\w]/g, '');

    if (normalizedInput === normalizedTarget) {
      setTypingFeedback({
        kind: 'correct',
        message: lang === 'en' ? 'Correct! You typed the word accurately.' : 'Chính xác! Bạn đã chép đúng từ vừa nghe.',
      });
      setIsWordMastered(true);
    } else {
      const length = currentItem.word.length;
      const mask = Array.from({ length }, () => '_').join(' ');
      setTypingFeedback({
        kind: 'incorrect',
        message: lang === 'en' ? 'Incorrect.' : 'Chưa chính xác.',
        hintChars: `${lang === 'en' ? 'Hint' : 'Gợi ý'}: ${mask} (${length} ${lang === 'en' ? 'letters' : 'chữ cái'})`,
      });
    }
  };

  // Voice recording via MediaRecorder & SpeechRecognition
  const startRecordingVoice = async () => {
    if (!currentItem) return;
    setSpeakingFeedback(null);
    setSpokenTranscript('');
    setHasRecorded(false);
    if (userAudioUrl) {
      URL.revokeObjectURL(userAudioUrl);
      setUserAudioUrl(null);
    }
    audioChunksRef.current = [];

    // 1. Audio stream and recorder
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const url = URL.createObjectURL(blob);
          setUserAudioUrl(url);
          setHasRecorded(true);
          setIsRecording(false);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch {
        showToast(lang === 'en' ? 'Cannot access microphone. Please check browser permissions.' : 'Không mở được micro để ghi âm. Vui lòng cấp quyền micro trên trình duyệt.');
      }
    } else {
      showToast(lang === 'en' ? 'Your browser does not support audio recording.' : 'Trình duyệt không hỗ trợ ghi âm trực tiếp.');
    }

    // 2. Concurrently start SpeechRecognition to get the recognized transcript
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 3;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript.trim().toLowerCase();
          setSpokenTranscript(transcript);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch {}
    }
  };

  const stopRecordingVoice = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
  };

  // Playback user's latest recorded voice
  const togglePlayUserAudio = () => {
    if (!userAudioUrl) return;
    if (!userAudioPlayerRef.current) {
      const audio = new Audio(userAudioUrl);
      audio.onended = () => setIsPlayingUserAudio(false);
      audio.onerror = () => setIsPlayingUserAudio(false);
      userAudioPlayerRef.current = audio;
    } else {
      userAudioPlayerRef.current.src = userAudioUrl;
    }

    if (isPlayingUserAudio) {
      userAudioPlayerRef.current.pause();
      setIsPlayingUserAudio(false);
    } else {
      userAudioPlayerRef.current.play().then(() => {
        setIsPlayingUserAudio(true);
      }).catch(() => {
        setIsPlayingUserAudio(false);
        showToast(lang === 'en' ? 'Cannot play back recording.' : 'Không thể phát bản ghi âm.');
      });
    }
  };

  // Explicit Check Button for Speaking Evaluation
  const handleCheckPronunciation = () => {
    if (!currentItem) return;

    const cleanTarget = currentItem.word.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTranscript = spokenTranscript.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    const isMatch = Boolean(
      cleanTranscript &&
      (cleanTranscript.includes(cleanTarget) ||
        cleanTarget.includes(cleanTranscript) ||
        cleanTranscript === cleanTarget)
    );

    if (isMatch) {
      setSpeakingFeedback({
        kind: 'correct',
        message: lang === 'en'
          ? `Accurate! You pronounced "${currentItem.word}" correctly.`
          : `Phát âm chính xác! Bạn đã phát âm chuẩn từ "${currentItem.word}".`,
      });
      setIsWordMastered(true);
    } else {
      setSpeakingFeedback({
        kind: 'incorrect',
        message: lang === 'en' ? 'Pronunciation is not accurate yet.' : 'Phát âm chưa chính xác.',
        advice: cleanTranscript
          ? (lang === 'en'
              ? `Microphone heard: "${spokenTranscript}". ${currentItem.hintTip || 'Listen to the sample and speak clearly.'}`
              : `Micro nhận diện: "${spokenTranscript}". ${currentItem.hintTip || 'Hãy nghe lại phát âm mẫu và phát âm rõ âm tiết.'}`)
          : (lang === 'en'
              ? 'Voice was not recognized clearly. You can listen to your recording and try speaking closer to the microphone.'
              : 'Chưa nhận diện rõ âm thanh. Hãy nghe lại bản ghi của bạn và thử phát âm to, rõ ràng hơn gần micro.'),
      });
    }
  };

  // Navigation handlers
  const handlePrevWord = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNextWord = () => {
    if (!currentItem) return;

    const currentItemToRemove = currentItem;
    const shouldAutoDelete = isWordMastered && !currentItemToRemove.isStarred;

    if (shouldAutoDelete) {
      // Auto-remove word from review list when mastered and unstarred
      const nextItems = items.filter((it) => it.id !== currentItemToRemove.id);
      updateItems(nextItems);
      apiFetch(`/users/review-list/${currentItemToRemove.id}`, { method: 'DELETE' }).catch(() => undefined);
      showToast(
        lang === 'en'
          ? `Mastered! "${currentItemToRemove.word}" was automatically removed from review list.`
          : `Hoàn thành chính xác! Từ "${currentItemToRemove.word}" đã được tự động loại khỏi danh sách ôn tập.`
      );
      if (currentIndex >= nextItems.length && nextItems.length > 0) {
        setCurrentIndex(0);
      }
    } else {
      if (isWordMastered && currentItemToRemove.isStarred) {
        showToast(
          lang === 'en'
            ? `Word "${currentItemToRemove.word}" is starred ⭐ and preserved in your list.`
            : `Từ "${currentItemToRemove.word}" có gắn sao ⭐ nên được giữ lại để bạn ôn tiếp!`
        );
      }
      if (currentIndex < filteredItems.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(0);
      }
    }
  };

  const counts = useMemo(() => {
    return {
      all: items.length,
      dict: items.filter((i) => i.source === 'DICTATION').length,
      shad: items.filter((i) => i.source === 'SHADOWING').length,
      starred: items.filter((i) => i.isStarred).length,
    };
  }, [items]);

  return (
    <main className="mx-auto min-h-[calc(100vh-76px)] max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-slate-900">
      {/* Nút quay lại danh sách bài học có ô khung rõ ràng */}
      <div className="mb-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-base font-bold text-slate-700 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
        >
          <span aria-hidden="true" className="text-lg">←</span> {lang === 'en' ? 'Back to lesson list' : 'Quay lại danh sách bài học'}
        </Link>
      </div>

      {/* Header */}
      <header className="mb-8">
        <span className="text-base font-bold uppercase tracking-wider text-blue-600">
          {lang === 'en' ? 'In-depth Vocabulary Review Center' : 'Trung tâm ôn tập từ vựng chuyên sâu'}
        </span>
        <h1 className="mt-1 text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
          📖 {lang === 'en' ? 'Vocabulary Review List' : 'Danh sách từ vựng ôn tập'}
        </h1>
        <p className="mt-2 text-lg text-slate-600 max-w-3xl">
          {lang === 'en'
            ? 'All words needing reinforcement from Listening & Speaking practice are collected here. Listen to pronunciation, hide words to test memory, or practice typing and speaking directly.'
            : 'Toàn bộ các từ cần củng cố khi Luyện nghe & Luyện nói được tập hợp tại đây. Bạn có thể nghe phát âm, ẩn từ để tự kiểm tra trí nhớ, hoặc luyện tập gõ và nói trực tiếp.'}
        </p>
      </header>

      {/* Thống kê nhanh 4 thẻ màu nổi bật */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <article className="rounded-2xl border-2 border-blue-200 bg-blue-50/70 p-5 shadow-sm">
          <span className="block text-sm font-bold uppercase tracking-wider text-blue-700">
            {lang === 'en' ? 'Total to review' : 'Tổng từ cần ôn'}
          </span>
          <strong className="mt-1 block text-3xl font-black text-blue-800">{counts.all}</strong>
        </article>
        <article className="rounded-2xl border-2 border-sky-200 bg-sky-50/70 p-5 shadow-sm">
          <span className="block text-sm font-bold uppercase tracking-wider text-sky-700">
            {lang === 'en' ? 'From Dictation' : 'Từ Luyện nghe'}
          </span>
          <strong className="mt-1 block text-3xl font-black text-sky-800">{counts.dict}</strong>
        </article>
        <article className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/70 p-5 shadow-sm">
          <span className="block text-sm font-bold uppercase tracking-wider text-indigo-700">
            {lang === 'en' ? 'From Shadowing' : 'Từ Luyện nói'}
          </span>
          <strong className="mt-1 block text-3xl font-black text-indigo-800">{counts.shad}</strong>
        </article>
        <article className="rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-5 shadow-sm">
          <span className="block text-sm font-bold uppercase tracking-wider text-amber-700">
            {lang === 'en' ? 'Starred ⭐' : 'Đã gắn sao ⭐'}
          </span>
          <strong className="mt-1 block text-3xl font-black text-amber-800">{counts.starred}</strong>
        </article>
      </section>

      {/* Bộ lọc, tìm kiếm và công cụ thao tác */}
      <section className="mb-6 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`rounded-xl px-4 py-2 text-base font-bold transition ${
              filter === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {lang === 'en' ? `All (${counts.all})` : `Tất cả (${counts.all})`}
          </button>
          <button
            type="button"
            onClick={() => setFilter('DICTATION')}
            className={`rounded-xl px-4 py-2 text-base font-bold transition ${
              filter === 'DICTATION'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {lang === 'en' ? `Dictation (${counts.dict})` : `Luyện nghe (${counts.dict})`}
          </button>
          <button
            type="button"
            onClick={() => setFilter('SHADOWING')}
            className={`rounded-xl px-4 py-2 text-base font-bold transition ${
              filter === 'SHADOWING'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {lang === 'en' ? `Shadowing (${counts.shad})` : `Luyện nói (${counts.shad})`}
          </button>
          <button
            type="button"
            onClick={() => setFilter('STARRED')}
            className={`rounded-xl px-4 py-2 text-base font-bold transition ${
              filter === 'STARRED'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {lang === 'en' ? `⭐ Starred (${counts.starred})` : `⭐ Yêu thích (${counts.starred})`}
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 md:w-64">
            <input
              type="text"
              placeholder={lang === 'en' ? 'Search vocabulary...' : 'Tìm kiếm từ vựng...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-2 text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={toggleAllBlur}
            className="rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2 text-base font-bold text-slate-700 hover:bg-slate-50 transition"
            title={lang === 'en' ? 'Hide or show all words to test memory' : 'Ẩn hoặc hiện toàn bộ từ để kiểm tra khả năng nhớ'}
          >
            {allBlurred ? (lang === 'en' ? '👁️ Show all' : '👁️ Hiện tất cả') : (lang === 'en' ? '👁️ Hide all' : '👁️ Ẩn tất cả')}
          </button>
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-xl border-2 border-rose-200 bg-rose-50 px-3.5 py-2 text-base font-bold text-rose-700 hover:bg-rose-100 transition"
              title={lang === 'en' ? 'Clear all review items' : 'Xóa toàn bộ danh sách ôn tập'}
            >
              🗑️ {lang === 'en' ? 'Clear all' : 'Xóa tất cả'}
            </button>
          )}
        </div>
      </section>

      {/* Main 2-column Layout */}
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1.8fr] items-start">
        {/* Left column: Word list */}
        <section className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xl font-extrabold text-slate-900">
              {lang === 'en' ? `Vocabulary List (${filteredItems.length})` : `Danh sách từ vựng (${filteredItems.length})`}
            </h2>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {lang === 'en' ? 'Select word to practice' : 'Chọn từ để luyện tập'}
            </span>
          </div>

          <div className="space-y-3.5 max-h-[640px] overflow-y-auto pr-1">
            {filteredItems.map((item, index) => {
              const isSelected = (currentItem?.id === item.id);
              const isBlurred = Boolean(blurredWordIds[item.id]);

              return (
                <article
                  key={item.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`cursor-pointer rounded-2xl border-2 p-4 transition ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-200'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <strong
                          className={`text-xl font-black text-slate-900 transition ${
                            isBlurred ? 'select-none blur-sm' : ''
                          }`}
                        >
                          {item.word}
                        </strong>
                        <span
                          className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${
                            item.source === 'SHADOWING'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {item.source === 'SHADOWING' ? (lang === 'en' ? 'Speaking' : 'Luyện nói') : (lang === 'en' ? 'Listening' : 'Luyện nghe')}
                        </span>
                        {item.isStarred && (
                          <span className="text-amber-500 font-bold text-sm" title="Đã lưu để ôn lại">
                            ★
                          </span>
                        )}
                      </div>

                      {item.sentence && (
                        <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">
                          &ldquo;{item.sentence}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => speakWord(item.word)}
                        title={lang === 'en' ? `Listen to "${item.word}"` : `Nghe phát âm "${item.word}"`}
                        className="rounded-lg p-2 text-slate-500 hover:bg-blue-100 hover:text-blue-700 transition"
                      >
                        🔊
                      </button>
                      <button
                        type="button"
                        onClick={(e) => toggleWordBlur(item.id, e)}
                        title={isBlurred ? (lang === 'en' ? 'Show this word' : 'Hiện từ này') : (lang === 'en' ? 'Hide this word' : 'Ẩn từ này')}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition"
                      >
                        {isBlurred ? '🙈' : '👁️'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => toggleStar(item.id, e)}
                        title={item.isStarred ? (lang === 'en' ? 'Unstar' : 'Bỏ dấu sao') : (lang === 'en' ? 'Star to preserve' : 'Gắn sao để không bị xóa')}
                        className={`rounded-lg p-2 transition ${item.isStarred ? 'text-amber-500 scale-110' : 'text-slate-400 hover:text-amber-500'}`}
                      >
                        {item.isStarred ? '★' : '☆'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleAddToPersonalDict(item, e)}
                        title={lang === 'en' ? 'Save to Personal Notebook' : 'Thêm vào Sổ từ vựng cá nhân'}
                        className="rounded-lg p-2 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700 transition"
                      >
                        📖
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        title={lang === 'en' ? 'Remove from review list' : 'Xóa khỏi danh sách ôn tập'}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {!filteredItems.length && (
              <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
                <span className="text-4xl block mb-2">🎉</span>
                <p className="text-base font-bold">
                  {items.length === 0
                    ? (lang === 'en' ? 'You have no vocabulary to review yet.' : 'Bạn chưa có từ vựng nào cần ôn lại.')
                    : (lang === 'en' ? 'No vocabulary found matching the filter.' : 'Không tìm thấy từ vựng phù hợp với bộ lọc.')}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right column: Interactive Practice Console */}
        <section className="rounded-3xl border-2 border-slate-200 bg-white p-7 shadow-sm sticky top-6">
          {currentItem ? (
            <div>
              {/* Word Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-3">
                    {/* Word Display: Masked in Dictation mode, revealed in Speaking mode */}
                    {practiceTab === 'SPEAKING' ? (
                      <span className="text-3xl font-black text-slate-900 tracking-tight">
                        {currentItem.word}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl font-black font-mono tracking-widest text-slate-800 bg-slate-100 px-4 py-1.5 rounded-2xl border-2 border-slate-200 select-none">
                          {isWordRevealedInConsole
                            ? currentItem.word
                            : '• '.repeat(Math.min(Math.max(currentItem.word.length, 4), 10)).trim()}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsWordRevealedInConsole(!isWordRevealedInConsole)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm"
                          title={isWordRevealedInConsole ? (lang === 'en' ? 'Hide answer' : 'Ẩn đáp án') : (lang === 'en' ? 'Show word' : 'Xem đáp án')}
                        >
                          {isWordRevealedInConsole
                            ? '🙈 ' + (lang === 'en' ? 'Hide' : 'Ẩn từ')
                            : '👁️ ' + (lang === 'en' ? 'Reveal' : 'Xem từ')}
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => speakWord(currentItem.word)}
                      title={lang === 'en' ? `Listen to "${currentItem.word}"` : `Nghe phát âm chuẩn "${currentItem.word}"`}
                      className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-white shadow-md hover:bg-blue-700 transition shrink-0"
                    >
                      🔊
                    </button>
                    <button
                      type="button"
                      onClick={(e) => toggleStar(currentItem.id, e)}
                      title={currentItem.isStarred ? (lang === 'en' ? 'Unstar' : 'Bỏ sao') : (lang === 'en' ? 'Star to preserve' : 'Gắn sao để lưu lại khi ôn')}
                      className={`text-2xl transition ${currentItem.isStarred ? 'text-amber-500 scale-110' : 'text-slate-300 hover:text-amber-400'}`}
                    >
                      {currentItem.isStarred ? '★' : '☆'}
                    </button>
                    {currentItem.isStarred && (
                      <span className="hidden sm:inline-block rounded-lg bg-amber-100 text-amber-800 text-xs px-2.5 py-1 font-bold">
                        ⭐ {lang === 'en' ? 'Saved' : 'Đã lưu ôn lại'}
                      </span>
                    )}
                  </div>
                  <span className="mt-1.5 inline-block text-xs font-extrabold uppercase tracking-wider text-blue-600">
                    {lang === 'en'
                      ? `Source: ${currentItem.source === 'SHADOWING' ? 'Speaking Practice (Shadowing)' : 'Listening Practice (Dictation)'}`
                      : `Nguồn từ: ${currentItem.source === 'SHADOWING' ? 'Bài Luyện nói (Shadowing)' : 'Bài Luyện nghe (Dictation)'}`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleAddToPersonalDict(currentItem, e)}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-2.5 text-base font-bold text-emerald-800 shadow-sm hover:bg-emerald-100 transition shrink-0"
                >
                  📖 {lang === 'en' ? 'Save to Notebook' : 'Lưu vào Sổ từ vựng'}
                </button>
              </div>

              {/* Ngữ cảnh câu: Ẩn từ trong ngữ cảnh nếu đang ở chế độ gõ để không lộ đáp án */}
              {currentItem.sentence && (
                <div className="my-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {lang === 'en' ? 'Lesson context:' : 'Ngữ cảnh bài học:'}
                  </p>
                  <p className="mt-1 text-base font-medium text-slate-800">
                    &ldquo;
                    {practiceTab === 'SPEAKING' || isWordRevealedInConsole
                      ? currentItem.sentence
                      : currentItem.sentence.replace(
                          new RegExp(`\\b${currentItem.word}\\b`, 'gi'),
                          '_______'
                        )}
                    &rdquo;
                  </p>
                  {/* Mẹo phát âm CHỈ hiển thị khi ở chế độ Luyện phát âm (Shadowing) */}
                  {practiceTab === 'SPEAKING' && currentItem.hintTip && (
                    <p className="mt-2 text-sm text-blue-800 bg-blue-50/80 p-2.5 rounded-xl border border-blue-100">
                      💡 <strong>{lang === 'en' ? 'Pronunciation tip:' : 'Mẹo phát âm:'}</strong> {currentItem.hintTip}
                    </p>
                  )}
                </div>
              )}

              {/* Interactive Test Modes */}
              <div className="mt-6">
                <div className="flex border-b-2 border-slate-200 mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      setPracticeTab('TYPING');
                      setIsWordRevealedInConsole(false);
                    }}
                    className={`pb-3 px-5 text-base font-bold transition border-b-4 -mb-[2px] ${
                      practiceTab === 'TYPING'
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ✍️ {lang === 'en' ? 'Typing Test (Dictation)' : 'Kiểm tra gõ từ (Dictation)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPracticeTab('SPEAKING');
                    }}
                    className={`pb-3 px-5 text-base font-bold transition border-b-4 -mb-[2px] ${
                      practiceTab === 'SPEAKING'
                        ? 'border-indigo-600 text-indigo-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🎙️ {lang === 'en' ? 'Pronunciation (Shadowing)' : 'Luyện phát âm (Shadowing)'}
                  </button>
                </div>

                {/* Tab Gõ chính tả */}
                {practiceTab === 'TYPING' && (
                  <form onSubmit={handleCheckTyped} className="space-y-4">
                    <p className="text-base text-slate-600">
                      {lang === 'en' ? 'Listen to the word and type it accurately below:' : 'Nghe phát âm từ và nhập lại chính xác từ vựng vào ô dưới đây:'}
                    </p>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={typedAnswer}
                        onChange={(e) => {
                          setTypedAnswer(e.target.value);
                          if (typingFeedback) setTypingFeedback(null);
                        }}
                        placeholder={lang === 'en' ? 'Type English word...' : 'Nhập từ vựng tiếng Anh...'}
                        className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 text-lg font-bold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => speakWord(currentItem.word)}
                        className="rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-3 text-lg hover:bg-slate-100 transition"
                        title={lang === 'en' ? 'Listen again' : 'Nghe lại'}
                      >
                        🔊
                      </button>
                      <button
                        type="submit"
                        disabled={!typedAnswer.trim()}
                        className="rounded-xl bg-blue-600 px-6 py-3 text-base font-bold text-white shadow-md hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {lang === 'en' ? 'Check' : 'Kiểm tra'}
                      </button>
                    </div>

                    {typingFeedback && (
                      <div
                        className={`rounded-2xl p-4 text-base font-bold ${
                          typingFeedback.kind === 'correct'
                            ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-2 border-rose-300'
                        }`}
                      >
                        <p>{typingFeedback.message}</p>
                        {typingFeedback.hintChars && (
                          <p className="mt-1 font-mono text-sm text-slate-600">
                            {typingFeedback.hintChars}
                          </p>
                        )}
                      </div>
                    )}
                  </form>
                )}

                {/* Tab Luyện nói */}
                {practiceTab === 'SPEAKING' && (
                  <div className="space-y-4">
                    <p className="text-base text-slate-600">
                      {lang === 'en' ? (
                        <>Click start to record and pronounce &ldquo;<strong>{currentItem.word}</strong>&rdquo;:</>
                      ) : (
                        <>Bấm nút bắt đầu để ghi âm và phát âm từ &ldquo;<strong>{currentItem.word}</strong>&rdquo;:</>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                      {isRecording ? (
                        <button
                          type="button"
                          onClick={stopRecordingVoice}
                          className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-6 py-3.5 text-base font-bold text-white shadow-md transition animate-pulse hover:bg-rose-700"
                        >
                          ⏹ {lang === 'en' ? 'Stop Recording' : 'Dừng ghi âm'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startRecordingVoice}
                          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-base font-bold text-white shadow-md transition hover:bg-indigo-700"
                        >
                          🎙️ {hasRecorded
                            ? (lang === 'en' ? 'Record Again' : 'Ghi âm lại')
                            : (lang === 'en' ? 'Start Recording' : 'Bắt đầu ghi âm')}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => speakWord(currentItem.word)}
                        className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-5 py-3 text-base font-bold text-slate-700 hover:bg-slate-50 transition"
                      >
                        🔊 {lang === 'en' ? 'Listen to Sample' : 'Nghe mẫu phát âm'}
                      </button>
                    </div>

                    {/* Hộp bản ghi âm mới nhất và nút kiểm tra */}
                    {hasRecorded && userAudioUrl && (
                      <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-3 w-3 rounded-full bg-emerald-500" />
                            <span className="text-sm font-bold text-indigo-950">
                              {lang === 'en' ? 'Your latest voice recording:' : 'Bản ghi âm mới nhất của bạn:'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={togglePlayUserAudio}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition"
                          >
                            {isPlayingUserAudio
                              ? '⏸ ' + (lang === 'en' ? 'Pause' : 'Tạm dừng')
                              : '▶ ' + (lang === 'en' ? 'Listen to your recording' : 'Nghe lại ghi âm')}
                          </button>
                        </div>

                        {spokenTranscript && (
                          <div className="rounded-xl border border-indigo-200 bg-white p-3 text-sm text-slate-800">
                            <strong>{lang === 'en' ? 'Speech recognized:' : 'Micro ghi nhận:'}</strong> &ldquo;{spokenTranscript}&rdquo;
                          </div>
                        )}

                        <div className="pt-1 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={handleCheckPronunciation}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 text-base font-bold text-white shadow-md transition"
                          >
                            ✓ {lang === 'en' ? 'Check Pronunciation' : 'Kiểm tra phát âm'}
                          </button>

                          <button
                            type="button"
                            onClick={startRecordingVoice}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition"
                          >
                            🔄 {lang === 'en' ? 'Re-record' : 'Ghi lại'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Thông báo kết quả kiểm tra phát âm */}
                    {speakingFeedback && (
                      <div
                        className={`rounded-2xl p-4 text-base font-bold transition animate-in fade-in duration-300 ${
                          speakingFeedback.kind === 'correct'
                            ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-400'
                            : 'bg-amber-50 text-amber-900 border-2 border-amber-400'
                        }`}
                      >
                        <p className="flex items-center gap-2">
                          <span>{speakingFeedback.kind === 'correct' ? '🎉' : '⚠️'}</span>
                          <span>{speakingFeedback.message}</span>
                        </p>
                        {speakingFeedback.advice && (
                          <p className="mt-1 text-sm font-normal text-slate-700">
                            {speakingFeedback.advice}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Thanh điều hướng: "Từ trước" và "Từ tiếp theo" */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t-2 border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={handlePrevWord}
                  disabled={currentIndex === 0}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-base font-bold text-slate-700 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                >
                  {lang === 'en' ? '← Previous word' : '← Từ trước'}
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-500">
                    {currentIndex + 1} / {filteredItems.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextWord}
                    disabled={filteredItems.length <= 1 && currentIndex === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-base font-bold text-white shadow-md transition disabled:opacity-50"
                  >
                    {lang === 'en' ? 'Next word →' : 'Từ tiếp theo →'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400">
              <span className="text-5xl block mb-3">📖</span>
              <p className="text-lg font-bold">
                {lang === 'en' ? 'Select a word on the left to start practicing' : 'Hãy chọn một từ ở cột bên trái để bắt đầu ôn tập'}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Redesigned Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 rounded-2xl border-2 border-emerald-400 bg-white/95 backdrop-blur-md px-5 py-4 text-slate-800 shadow-2xl shadow-emerald-500/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-lg font-black text-white shadow-md">
            ✓
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">
              {lang === 'en' ? 'Vocabulary Review' : 'Ôn tập từ vựng'}
            </p>
            <p className="text-base font-bold text-slate-800">{toastMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 font-bold p-1"
            aria-label={lang === 'en' ? 'Close' : 'Đóng'}
          >
            ✕
          </button>
        </div>
      )}
    </main>
  );
}

export default function VocabularyReviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải danh sách từ vựng ôn tập…</div>}>
      <VocabularyReviewContent />
    </Suspense>
  );
}

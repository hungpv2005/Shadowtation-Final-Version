'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/lib/i18n';

export type PartOfSpeech = 'n' | 'v' | 'adj' | 'adv' | 'phrase' | 'prep' | 'conj' | 'other';

export type PersonalWord = {
  id: string;
  word: string;
  meaning: string;
  partOfSpeech?: string;
  example?: string;
  addedAt: string;
  source?: string;
};

const STORAGE_KEY = 'shadowtation.personal_dictionary';

export const POS_OPTIONS: Array<{ value: string; label: string; labelEn: string; short: string; color: string }> = [
  { value: 'n', label: 'Danh từ (noun)', labelEn: 'Noun (n)', short: 'n.', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'v', label: 'Động từ (verb)', labelEn: 'Verb (v)', short: 'v.', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'adj', label: 'Tính từ (adjective)', labelEn: 'Adjective (adj)', short: 'adj.', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'adv', label: 'Trạng từ (adverb)', labelEn: 'Adverb (adv)', short: 'adv.', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'phrase', label: 'Cụm từ (phrase)', labelEn: 'Phrase', short: 'phrase', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { value: 'prep', label: 'Giới từ (preposition)', labelEn: 'Preposition (prep)', short: 'prep.', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { value: 'conj', label: 'Liên từ (conjunction)', labelEn: 'Conjunction (conj)', short: 'conj.', color: 'bg-teal-100 text-teal-800 border-teal-300' },
  { value: 'other', label: 'Khác (other)', labelEn: 'Other', short: 'other', color: 'bg-slate-100 text-slate-700 border-slate-300' },
];

export function getPosBadge(pos?: string) {
  const normalized = (pos || 'n').toLowerCase().trim();
  const found = POS_OPTIONS.find((opt) => opt.value === normalized || opt.short.replace('.', '') === normalized);
  return found ?? POS_OPTIONS[0];
}

const DEFAULT_WORDS: PersonalWord[] = [
  {
    id: 'pw-1',
    word: 'dictation',
    partOfSpeech: 'n',
    meaning: 'việc luyện nghe chép chính tả',
    example: 'Practice dictation daily to improve your listening skill.',
    addedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    source: 'Luyện nghe',
  },
  {
    id: 'pw-2',
    word: 'shadowing',
    partOfSpeech: 'n',
    meaning: 'kỹ thuật luyện nói nhại theo mẫu người bản xứ',
    example: 'Shadowing technique boosts pronunciation and speech rhythm.',
    addedAt: new Date(Date.now() - 86400000).toISOString(),
    source: 'Luyện nói',
  },
  {
    id: 'pw-3',
    word: 'comprehension',
    partOfSpeech: 'n',
    meaning: 'khả năng thấu hiểu nội dung nghe hoặc đọc',
    example: 'Listening comprehension is crucial for English learners.',
    addedAt: new Date().toISOString(),
    source: 'Tự thêm',
  },
  {
    id: 'pw-4',
    word: 'fluency',
    partOfSpeech: 'n',
    meaning: 'sự trôi chảy, lưu loát trong giao tiếp',
    example: 'Speaking every day builds natural fluency.',
    addedAt: new Date().toISOString(),
    source: 'Tự thêm',
  },
];

export function isUserPremium(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('student_profile');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.role === 'PREMIUM_STUDENT' || u?.role === 'ADMIN' || u?.isPremium === true) return true;
    }
    return localStorage.getItem('shadowtation_tier') === 'PREMIUM';
  } catch {
    return false;
  }
}

export function addWordToPersonalDictionary(
  word: string,
  meaning: string = '',
  example: string = '',
  source: string = 'Học tập',
  partOfSpeech: string = 'n',
): boolean {
  if (typeof window === 'undefined' || !word.trim()) return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const words: PersonalWord[] = raw ? JSON.parse(raw) : DEFAULT_WORDS;
    const cleanWord = word.trim();

    // Auto-detect part of speech if passed in parenthesis like "word (adj)" or inside meaning
    let detectedPos = partOfSpeech || 'n';
    if (cleanWord.includes('(')) {
      const match = cleanWord.match(/\((n|v|adj|adv|phrase|prep|conj|other)\)/i);
      if (match) detectedPos = match[1].toLowerCase();
    }

    const baseWord = cleanWord.replace(/\s*\([^)]*\)\s*/g, '').trim();
    const existingIndex = words.findIndex((item) => item.word.toLowerCase() === baseWord.toLowerCase());

    // Enforce 20 words limit for Free account when adding a brand new word
    if (existingIndex < 0 && !isUserPremium() && words.length >= 20) {
      return false;
    }

    if (existingIndex >= 0) {
      words[existingIndex].meaning = meaning || words[existingIndex].meaning;
      words[existingIndex].partOfSpeech = detectedPos || words[existingIndex].partOfSpeech || 'n';
      words[existingIndex].example = example || words[existingIndex].example;
      words[existingIndex].addedAt = new Date().toISOString();
    } else {
      words.unshift({
        id: `pw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        word: baseWord,
        partOfSpeech: detectedPos,
        meaning: meaning || 'Vocabulary to remember in context',
        example: example || `Practice the word "${baseWord}" frequently to remember long-term.`,
        addedAt: new Date().toISOString(),
        source,
      });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    window.dispatchEvent(new CustomEvent('shadowtation:dictionary-updated'));
    return true;
  } catch {
    return false;
  }
}

export default function ReviewListPage() {
  const { lang } = useLanguage();
  const [words, setWords] = useState<PersonalWord[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [search, setSearch] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newPos, setNewPos] = useState<string>('n');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExample, setNewExample] = useState('');
  const [pasteBox, setPasteBox] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadWords = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((item: any) => ({
            ...item,
            partOfSpeech: item.partOfSpeech || 'n',
            example: item.example || (lang === 'en' ? `Practice "${item.word}" in context.` : `Luyện tập từ "${item.word}" trong bài học.`),
          }));
          setWords(normalized);
          return;
        }
      }
      setWords(DEFAULT_WORDS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WORDS));
    } catch {
      setWords(DEFAULT_WORDS);
    }
  };

  useEffect(() => {
    loadWords();
    const checkTier = () => setIsPremium(isUserPremium());
    checkTier();
    const handleUpdate = () => {
      loadWords();
      checkTier();
    };
    window.addEventListener('shadowtation:dictionary-updated', handleUpdate);
    window.addEventListener('shadowtation:auth-change', checkTier);
    return () => {
      window.removeEventListener('shadowtation:dictionary-updated', handleUpdate);
      window.removeEventListener('shadowtation:auth-change', checkTier);
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 3500);
  };

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    if (!isPremium && words.length >= 20) {
      showToast(lang === 'en' ? '⚠️ You have reached the 20-word limit on the Free plan. Upgrade to Premium for unlimited storage!' : '⚠️ Bạn đã dùng hết 20 từ của tài khoản Miễn phí. Hãy nâng cấp Premium để lưu không giới hạn!');
      return;
    }
    const ok = addWordToPersonalDictionary(newWord, newMeaning, newExample, lang === 'en' ? 'Notebook' : 'Sổ tay', newPos);
    if (ok) {
      loadWords();
      setNewWord('');
      setNewPos('n');
      setNewMeaning('');
      setNewExample('');
      showToast(lang === 'en' ? 'Saved word to personal vocabulary notebook!' : 'Đã thêm từ vào Sổ từ vựng cá nhân thành công!');
    } else {
      showToast(lang === 'en' ? '⚠️ Cannot add: Free plan limit is 20 words. Please upgrade to Premium!' : '⚠️ Không thể thêm: Tài khoản Miễn phí giới hạn tối đa 20 từ vựng. Vui lòng nâng cấp Premium!');
    }
  };

  const handleQuickPaste = () => {
    if (!pasteBox.trim()) return;
    if (!isPremium && words.length >= 20) {
      showToast(lang === 'en' ? '⚠️ Free plan reached 20-word limit. Upgrade to Premium for unlimited storage!' : '⚠️ Tài khoản Miễn phí đã đạt giới hạn 20 từ. Nâng cấp Premium để lưu không giới hạn!');
      return;
    }
    const lines = pasteBox.split('\n');
    let addedCount = 0;
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let w = '';
      let pos = 'n';
      let m = '';

      if (trimmed.includes('-')) {
        const parts = trimmed.split('-').map((p) => p.trim());
        if (parts.length >= 3) {
          w = parts[0];
          const rawPos = parts[1].toLowerCase().replace(/[()]/g, '');
          const matchPos = POS_OPTIONS.find((opt) => opt.value === rawPos || opt.short.replace('.', '') === rawPos);
          pos = matchPos ? matchPos.value : 'n';
          m = parts.slice(2).join(' - ');
        } else if (parts.length === 2) {
          w = parts[0];
          m = parts[1];
        }
      } else if (trimmed.includes(':')) {
        const parts = trimmed.split(':').map((p) => p.trim());
        w = parts[0];
        m = parts.slice(1).join(': ');
      } else {
        w = trimmed;
      }

      if (w) {
        addWordToPersonalDictionary(w, m, '', lang === 'en' ? 'Quick Paste' : 'Paste nhanh', pos);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      loadWords();
      setPasteBox('');
      setShowPasteModal(false);
      showToast(lang === 'en' ? `Added ${addedCount} words to vocabulary notebook!` : `Đã thêm thành công ${addedCount} từ vào Sổ từ vựng!`);
    }
  };

  const handleDeleteWord = (id: string) => {
    const next = words.filter((item) => item.id !== id);
    setWords(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    showToast(lang === 'en' ? 'Deleted word from notebook.' : 'Đã xóa từ khỏi Sổ từ vựng cá nhân.');
  };

  const handleDeleteSelected = () => {
    if (!selectedIds.length) return;
    const next = words.filter((item) => !selectedIds.includes(item.id));
    setWords(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    const count = selectedIds.length;
    setSelectedIds([]);
    showToast(lang === 'en' ? `Deleted ${count} selected words from notebook.` : `Đã xóa ${count} từ đã chọn khỏi Sổ từ vựng.`);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredWords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredWords.map((item) => item.id));
    }
  };

  const speakWord = (word: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const filteredWords = useMemo(() => {
    if (!search.trim()) return words;
    const q = search.trim().toLowerCase();
    return words.filter(
      (item) =>
        item.word.toLowerCase().includes(q) ||
        item.meaning.toLowerCase().includes(q) ||
        (item.partOfSpeech && item.partOfSpeech.toLowerCase().includes(q)),
    );
  }, [words, search]);

  return (
    <main className="mx-auto min-h-[calc(100vh-76px)] max-w-7xl px-5 py-8 text-slate-900 dark:text-slate-100 md:px-8 md:py-10">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-base font-bold text-slate-700 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-slate-800"
        >
          <span aria-hidden="true" className="text-lg">←</span> {lang === 'en' ? 'Back to Home' : 'Quay lại trang chủ'}
        </Link>
      </div>

      <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <span className="text-base font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {lang === 'en' ? 'Personal Study Notebook' : 'Sổ tay học tập cá nhân'}
          </span>
          <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white md:text-4xl">
            {lang === 'en' ? 'Personal Vocabulary Notebook' : 'Sổ từ vựng cá nhân'}
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            {lang === 'en'
              ? 'Manage your personalized vocabulary: English word, Part of Speech (n, v, adj...), definition, context sentence, and native pronunciation.'
              : 'Quản lý từ vựng riêng của bạn: lưu đầy đủ Từ tiếng Anh, Loại từ (n, v, adj...), Nghĩa tiếng Việt, Câu ví dụ ngữ cảnh và Phát âm.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowPasteModal(true)}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-blue-300 bg-blue-50 px-5 py-2.5 text-base font-bold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:border-blue-400 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/80"
          >
            📋 {lang === 'en' ? 'Quick Paste from Clipboard' : 'Dán nhanh từ clipboard'}
          </button>
        </div>
      </header>

      {/* Grid: Add Word Form + Word List */}
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1.9fr]">
        {/* Form ghi chú từ mới */}
        <section className="rounded-3xl border-2 border-slate-200 bg-white p-7 shadow-sm flex flex-col justify-between dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {lang === 'en' ? 'Add New Word to Notebook' : 'Thêm từ mới vào sổ'}
            </h2>
            <p className="mt-1 text-base text-slate-500 dark:text-slate-400">
              {lang === 'en'
                ? 'Save English words, select part of speech, meaning, and context examples for long-term retention.'
                : 'Ghi lại từ tiếng Anh, chọn loại từ, nghĩa tiếng Việt và câu ví dụ để ôn tập lâu dài.'}
            </p>
            <form onSubmit={handleAddWord} className="mt-6 space-y-5">
              <div>
                <label htmlFor="new-word-input" className="block text-base font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'en' ? 'English Word' : 'Từ vựng tiếng Anh'} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="new-word-input"
                  type="text"
                  required
                  placeholder={lang === 'en' ? 'e.g. persistent, obstacle, ...' : 'Ví dụ: persistent, obstacle, ...'}
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  className="mt-2 w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-base font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-blue-950"
                />
              </div>

              <div>
                <label htmlFor="new-pos-select" className="block text-base font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'en' ? 'Part of Speech' : 'Loại từ vựng (Part of Speech)'} <span className="text-rose-500">*</span>
                </label>
                <select
                  id="new-pos-select"
                  value={newPos}
                  onChange={(e) => setNewPos(e.target.value)}
                  className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-950"
                >
                  {POS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {lang === 'en' ? opt.labelEn : opt.label} ({opt.short})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="new-meaning-input" className="block text-base font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'en' ? 'Definition / Meaning' : 'Nghĩa tiếng Việt'}
                </label>
                <input
                  id="new-meaning-input"
                  type="text"
                  placeholder={lang === 'en' ? 'e.g. continuing firmly or obstinately' : 'Ví dụ: kiên trì, chướng ngại vật, ...'}
                  value={newMeaning}
                  onChange={(e) => setNewMeaning(e.target.value)}
                  className="mt-2 w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-blue-950"
                />
              </div>

              <div>
                <label htmlFor="new-example-input" className="block text-base font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'en' ? 'Example Sentence (Context)' : 'Câu ví dụ (ngữ cảnh)'}
                </label>
                <textarea
                  id="new-example-input"
                  rows={3}
                  placeholder={lang === 'en' ? 'e.g. Practice makes perfect.' : 'Ví dụ: Practice makes perfect.'}
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  className="mt-2 w-full rounded-xl border-2 border-slate-200 p-3.5 text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-blue-950"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 px-5 py-4 text-base font-bold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg"
              >
                + {lang === 'en' ? 'Save to Notebook' : 'Lưu vào sổ từ vựng'}
              </button>
            </form>
          </div>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-sm text-blue-900 leading-relaxed dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
            <strong>💡 {lang === 'en' ? 'Quick Paste Format:' : 'Định dạng dán nhanh:'}</strong>{' '}
            {lang === 'en' ? 'Paste lines matching ' : 'Bạn có thể dán theo định dạng '}
            <code className="rounded bg-white px-1.5 py-0.5 border border-blue-200 font-bold text-blue-700 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-300">
              word - pos - meaning
            </code>{' '}
            ({lang === 'en' ? 'Example: ' : 'Ví dụ: '}
            <em className="text-slate-700 dark:text-slate-300">resilience - n - mental toughness</em>).
          </div>
        </section>

        {/* Danh sách từ vựng */}
        <section className="rounded-3xl border-2 border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {lang === 'en' ? 'Saved Vocabulary' : 'Danh sách từ đã lưu'}
              </h2>
              <span
                className={`rounded-full px-3.5 py-1 text-sm font-black ${
                  isPremium
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                }`}
              >
                {isPremium
                  ? `${words.length} ${lang === 'en' ? 'words · Unlimited (★ VIP)' : 'từ · Không giới hạn (★ VIP)'}`
                  : `${words.length}/20 ${lang === 'en' ? 'words (Free)' : 'từ (Miễn phí)'}`}
              </span>
            </div>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-2 text-base font-bold text-rose-700 hover:bg-rose-100 transition dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
              >
                🗑️ {lang === 'en' ? `Delete ${selectedIds.length} selected` : `Xóa ${selectedIds.length} từ đã chọn`}
              </button>
            )}
          </div>

          {/* Search bar & Select All */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <input
                type="text"
                placeholder={lang === 'en' ? 'Search by word, meaning, or part of speech (n, v, adj...)...' : 'Tìm theo từ, nghĩa hoặc loại từ (n, v, adj...)...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-blue-950"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 font-bold dark:hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>

            {filteredWords.length > 0 && (
              <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredWords.length && filteredWords.length > 0}
                  onChange={toggleSelectAll}
                  className="h-5 w-5 rounded accent-blue-600"
                />
                {lang === 'en' ? 'Select All' : 'Chọn tất cả'}
              </label>
            )}
          </div>

          {/* Word List Items */}
          <div className="mt-6 space-y-4 max-h-[620px] overflow-y-auto pr-1">
            {filteredWords.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const badge = getPosBadge(item.partOfSpeech);

              return (
                <article
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border-2 p-5 transition ${
                    isSelected
                      ? 'border-blue-400 bg-blue-50/50 shadow-sm dark:border-blue-500 dark:bg-blue-950/40'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-850 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id],
                        )
                      }
                      className="mt-1 h-5 w-5 rounded accent-blue-600 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      {/* Word + POS + Audio */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <strong className="text-xl font-black text-slate-900 tracking-tight dark:text-white">{item.word}</strong>
                        <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-black uppercase ${badge.color}`}>
                          {badge.short}
                        </span>
                        <button
                          type="button"
                          onClick={() => speakWord(item.word)}
                          title={lang === 'en' ? `Listen to "${item.word}"` : `Nghe phát âm từ "${item.word}"`}
                          className="grid h-8 w-8 place-items-center rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 transition shadow-sm dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
                        >
                          🔊
                        </button>
                        {item.source && (
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {item.source}
                          </span>
                        )}
                      </div>

                      {/* Meaning */}
                      <p className="mt-1.5 text-base font-bold text-slate-800 dark:text-slate-200">
                        {item.meaning || (lang === 'en' ? 'No definition provided' : 'Chưa có nghĩa')}
                      </p>

                      {/* Example */}
                      {item.example ? (
                        <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{lang === 'en' ? 'Context:' : 'Ngữ cảnh:'}</span> &ldquo;{item.example}&rdquo;
                        </div>
                      ) : (
                        <div className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-2 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900/30">
                          {lang === 'en' ? 'No example sentence' : 'Chưa có câu ví dụ'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeleteWord(item.id)}
                      title={lang === 'en' ? 'Delete this word' : 'Xóa từ này khỏi sổ'}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-base text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                    >
                      🗑️
                    </button>
                  </div>
                </article>
              );
            })}

            {!filteredWords.length && (
              <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                <span className="text-4xl block mb-2">📚</span>
                <p className="text-lg font-bold">
                  {words.length === 0
                    ? (lang === 'en' ? 'Your vocabulary notebook is empty. Add your first word on the left!' : 'Sổ từ vựng của bạn đang trống. Thêm từ đầu tiên ở bên trái!')
                    : (lang === 'en' ? 'No words matching your search.' : 'Không tìm thấy từ phù hợp với từ khóa.')}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Quick Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border-2 border-slate-200 bg-white p-7 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {lang === 'en' ? 'Quick Paste Vocabulary' : 'Dán nhanh từ vựng'}
            </h3>
            <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
              {lang === 'en' ? 'Paste your list of words here. Recommended format:' : 'Dán danh sách từ của bạn vào đây. Định dạng khuyên dùng:'}
              <br />
              <code className="text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60 dark:bg-blue-950 dark:text-blue-300">
                word - pos - meaning
              </code>
            </p>
            <textarea
              rows={6}
              value={pasteBox}
              onChange={(e) => setPasteBox(e.target.value)}
              placeholder={lang === 'en' ? 'resilience - n - mental toughness\nfluent - adj - able to express easily\npractice - v - perform repeatedly' : 'resilience - n - sự kiên cường\nfluent - adj - lưu loát, trôi chảy\npractice - v - luyện tập, thực hành'}
              className="mt-4 w-full rounded-2xl border-2 border-slate-200 p-4 text-base font-mono outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-950"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="rounded-xl border-2 border-slate-300 px-5 py-2.5 text-base font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {lang === 'en' ? 'Cancel' : 'Hủy'}
              </button>
              <button
                type="button"
                onClick={handleQuickPaste}
                disabled={!pasteBox.trim()}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-base font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
              >
                {lang === 'en' ? 'Import to Notebook' : 'Nhập vào sổ từ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 rounded-2xl border-2 border-emerald-400 bg-white/95 backdrop-blur-md px-5 py-4 text-slate-800 shadow-2xl shadow-emerald-500/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 dark:border-emerald-500/50 dark:bg-slate-900/95 dark:text-slate-100"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-lg font-black text-white shadow-md">
            ✓
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {lang === 'en' ? 'Personal Notebook' : 'Sổ từ vựng cá nhân'}
            </p>
            <p className="text-base font-bold text-slate-800 dark:text-slate-100">{toastMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 font-bold p-1 dark:hover:text-slate-200"
            aria-label={lang === 'en' ? 'Close' : 'Đóng thông báo'}
          >
            ✕
          </button>
        </div>
      )}
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type WordResult = { word: string; accuracy_score: number; error_type: string };
type DictationResult = { overall_score: number; accuracy_score: number; words_score_detail: WordResult[] };
type ResultItem = {
  attemptId: string;
  createdAt: string;
  lessonId: string;
  lessonTitle: string;
  sentenceId: string;
  sentenceText: string;
  submittedText: string | null;
  result: DictationResult | null;
};

const VOCAB_STORAGE_KEY = 'shadowtation.vocab_review_items';

function wordClass(word: WordResult) {
  if (word.error_type === 'None') return 'shadowing-word-green';
  return word.accuracy_score >= 85 ? 'shadowing-word-yellow' : 'shadowing-word-red';
}

export default function DictationResultsPage() {
  const [items, setItems] = useState<ResultItem[]>([]);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<{ items: ResultItem[] }>('/practice/dictation/history').catch(() => ({ items: [] })),
      apiFetch<{ count: number; items?: any[] }>('/users/review-list?source=DICTATION').catch(() => null),
    ])
      .then(([historyData, reviewData]) => {
        setItems(historyData?.items ?? []);
        if (reviewData && typeof reviewData.count === 'number') {
          setReviewCount(reviewData.count);
        } else {
          // Check localStorage sync with vocabulary review items
          try {
            const raw = localStorage.getItem(VOCAB_STORAGE_KEY);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                const dictWords = list.filter((i) => i.source === 'DICTATION');
                setReviewCount(dictWords.length);
              }
            }
          } catch {}
        }
      })
      .catch((cause: Error) => setError(cause.message || 'Chưa tải được lịch sử Luyện nghe.'))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const scored = items.filter((item) => item.result);
    const average = scored.length
      ? Math.round(scored.reduce((sum, item) => sum + item.result!.overall_score, 0) / scored.length)
      : 0;
    const historyWords = scored.reduce(
      (sum, item) => sum + item.result!.words_score_detail.filter((word) => word.error_type !== 'None').length,
      0,
    );
    const finalWordsToPractice = reviewCount !== null ? reviewCount : historyWords;
    return { count: scored.length, average, wordsToPractice: finalWordsToPractice };
  }, [items, reviewCount]);

  return (
    <main className="shadowing-history-page max-w-5xl mx-auto px-4 py-8">
      <header className="shadowing-history-header mb-8">
        <div>
          <Link
            href="/practice/dictation?mode=dictation"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-base font-bold text-slate-700 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 mb-6"
          >
            ← Quay lại danh sách bài
          </Link>
          <p className="text-base font-bold uppercase tracking-wider text-blue-600">Luyện nghe (Dictation)</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-extrabold text-slate-900">Kết quả và tiến bộ Luyện nghe</h1>
          <p className="mt-2 text-lg text-slate-600">Xem điểm chép chính xác từng câu và danh sách những từ cần luyện thêm để cải thiện kỹ năng nghe chính tả.</p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" aria-label="Tóm tắt kết quả Luyện nghe">
        <article className="rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-6 shadow-sm">
          <span className="block text-base font-bold text-slate-600 uppercase tracking-wide">Lượt đã chấm</span>
          <strong className="mt-2 block text-4xl font-black text-blue-700">{summary.count}</strong>
        </article>
        <article className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-6 shadow-sm">
          <span className="block text-base font-bold text-slate-600 uppercase tracking-wide">Điểm trung bình thực</span>
          <strong className="mt-2 block text-4xl font-black text-emerald-700">{summary.count ? `${summary.average}/100` : '—'}</strong>
        </article>
        <article className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-6 shadow-sm">
          <span className="block text-base font-bold text-slate-600 uppercase tracking-wide">Từ cần luyện thêm</span>
          <strong className="mt-2 block text-4xl font-black text-amber-600">{summary.wordsToPractice}</strong>
        </article>
      </section>

      {loading && <p className="text-center py-12 text-lg font-bold text-slate-500">Đang tải kết quả Luyện nghe…</p>}
      {error && (
        <div role="alert" className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-6 text-lg text-rose-700 mb-6">
          <p className="font-bold">{error}</p>
          <p className="mt-2 text-base text-rose-600">
            <Link href="/login" className="underline font-bold">Đăng nhập lại</Link> hoặc thử tải lại trang.
          </p>
        </div>
      )}
      {!loading && !error && !items.length && (
        <section className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center my-8">
          <span aria-hidden="true" className="text-5xl">✍️</span>
          <h2 className="mt-4 text-2xl font-extrabold text-slate-800">Chưa có kết quả Luyện nghe</h2>
          <p className="mt-2 text-lg text-slate-600">Sau khi hoàn thành bài Luyện nghe, điểm từng câu và phân tích đối chiếu từ sẽ hiển thị tại đây.</p>
        </section>
      )}

      <section className="flex flex-col gap-5" aria-label="Lịch sử kết quả Luyện nghe">
        {items.map((item) => {
          const result = item.result;
          const expanded = expandedId === item.attemptId;
          return (
            <article key={item.attemptId} className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm hover:shadow-md transition overflow-hidden">
              <button
                type="button"
                className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 text-left bg-white hover:bg-slate-50 transition"
                aria-expanded={expanded}
                onClick={() => setExpandedId(expanded ? null : item.attemptId)}
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl font-black text-white shadow-sm">
                    {result?.overall_score ?? '—'}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      {item.lessonTitle} · {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </p>
                    <p className="mt-1 text-lg md:text-xl font-bold text-slate-800">{item.sentenceText}</p>
                  </div>
                </div>
                <span className="self-end md:self-center shrink-0 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-2 text-base font-bold text-blue-700">
                  {expanded ? 'Thu gọn' : 'Xem kết quả'}
                </span>
              </button>
              {expanded && result && (
                <div className="border-t-2 border-slate-100 bg-slate-50/70 p-6">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-xl bg-blue-100/80 px-4 py-2 text-base font-bold text-blue-800">
                    <span>Độ chính xác:</span>
                    <strong className="text-lg">{result.accuracy_score}%</strong>
                  </div>
                  <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-base text-slate-600">
                      <strong className="text-slate-800">Bạn đã nhập:</strong> {item.submittedText || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-700 mb-2">Đối chiếu chi tiết từng từ:</p>
                    <div className="flex flex-wrap gap-2.5">
                      {result.words_score_detail.map((word, index) => (
                        <span
                          key={`${index}-${word.word}`}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-base font-bold shadow-sm ${wordClass(word)}`}
                          title={`${word.accuracy_score}% · ${word.error_type}`}
                        >
                          {word.word}
                          <small className="opacity-80 text-xs font-semibold">{word.accuracy_score}</small>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}

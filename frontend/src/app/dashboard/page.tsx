'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';

type Period = '7d' | '30d' | 'all';
type ProgressData = {
  period: Period;
  account: { role: string; isPremium: boolean; premiumExpiredAt: string | null };
  summary: {
    completedAttempts: number;
    accuracyRate: number;
    studySeconds: number;
    currentStreak: number;
    dailyPoints: number;
    reviewWordCount: number;
  };
  chart: Array<{ date: string; attempts: number; accuracyRate: number | null; studySeconds: number }>;
};
type StreakData = { currentStreak: number; days: Array<{ date: string; isActive: boolean; dailyPoints: number }> };

function formatStudyTime(seconds: number, lang: 'vi' | 'en' = 'vi') {
  if (lang === 'en') {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins`;
    const hours = seconds / 3600;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hrs`;
  }
  if (seconds < 60) return `${seconds} giây`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút`;
  const hours = seconds / 3600;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} giờ`;
}

function formatDate(
  date: string,
  langOrOptions?: 'vi' | 'en' | Intl.DateTimeFormatOptions,
  maybeOptions?: Intl.DateTimeFormatOptions,
) {
  let lang: 'vi' | 'en' = 'vi';
  let options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

  if (typeof langOrOptions === 'string') {
    lang = langOrOptions;
    if (maybeOptions) options = maybeOptions;
  } else if (typeof langOrOptions === 'object' && langOrOptions !== null) {
    options = langOrOptions;
  }

  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'vi-VN', options).format(new Date(`${date}T12:00:00`));
}

function BarProgressChart({ data, period, lang = 'vi' }: { data: ProgressData['chart']; period: Period; lang?: 'vi' | 'en' }) {
  const width = 800;
  const height = 290;
  const left = 55;
  const right = 25;
  const top = 30;
  const bottom = 55;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  if (!data.length) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-base font-medium text-slate-600">
        Chưa có số liệu. Hoàn thành một bài luyện tập để bắt đầu theo dõi biểu đồ tiến độ.
      </div>
    );
  }

  const barSlotWidth = plotWidth / data.length;
  const barWidth = Math.max(12, Math.min(period === '7d' ? 44 : 26, barSlotWidth * 0.65));

  return (
    <div className="w-full overflow-x-auto pt-2">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ cột độ chính xác theo lượt luyện tập" className="min-w-[660px] w-full select-none">
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="emptyBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>
        </defs>

        {/* Trục Y Gridlines & Y-Axis Labels */}
        {[0, 25, 50, 75, 100].map((score) => {
          const y = top + plotHeight * (1 - score / 100);
          return (
            <g key={score}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={score === 0 ? undefined : '4 4'} strokeWidth={score === 0 ? '1.5' : '1'} />
              <text x={left - 12} y={y + 4} textAnchor="end" fontSize="12" fontWeight="700" fill="#64748b">
                {score}%
              </text>
            </g>
          );
        })}

        {/* Cột dữ liệu */}
        {data.map((item, index) => {
          const centerX = left + index * barSlotWidth + barSlotWidth / 2;
          const accuracy = item.accuracyRate ?? 0;
          const hasAttempts = item.attempts > 0;
          const barHeight = hasAttempts ? Math.max(8, plotHeight * (accuracy / 100)) : 4;
          const barY = top + plotHeight - barHeight;
          const showDate = period === '7d' || index === 0 || index === data.length - 1 || index % (period === '30d' ? 5 : 7) === 0;

          return (
            <g key={item.date} className="transition-all hover:opacity-90">
              {/* Cột bar */}
              <rect
                x={centerX - barWidth / 2}
                y={barY}
                width={barWidth}
                height={barHeight}
                rx={6}
                fill={hasAttempts ? 'url(#barGradient)' : 'url(#emptyBarGradient)'}
                className="cursor-pointer"
              >
                <title>{`${formatDate(item.date)}: ${item.attempts} lượt luyện tập, độ chính xác ${hasAttempts ? `${accuracy}%` : 'chưa có'}`}</title>
              </rect>

              {/* Text điểm số % trên đỉnh cột */}
              {hasAttempts && (
                <text
                  x={centerX}
                  y={barY - 8}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="800"
                  fill="#1e3a8a"
                >
                  {accuracy}%
                </text>
              )}

              {/* Label ngày bên dưới trục X */}
              {showDate && (
                <text
                  x={centerX}
                  y={top + plotHeight + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#475569"
                >
                  {formatDate(item.date, period === 'all' ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'numeric' })}
                </text>
              )}

              {/* Label số lượt luyện tập */}
              {hasAttempts && (
                <text
                  x={centerX}
                  y={top + plotHeight + 36}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="#2563eb"
                >
                  {item.attempts} lượt
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const { lang, t } = useLanguage();
  const [period, setPeriod] = useState<Period>('7d');
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const periods: Array<{ value: Period; label: string }> = [
    { value: '7d', label: t('dashboard.period_7d') },
    { value: '30d', label: t('dashboard.period_30d') },
    { value: 'all', label: t('dashboard.period_all') },
  ];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      apiFetch<ProgressData>(`/users/progress?period=${period}`),
      apiFetch<StreakData>('/users/streak-logs?days=35'),
    ])
      .then(([progressResult, streakResult]) => {
        if (!active) return;
        setProgress(progressResult);
        setStreak(streakResult);
      })
      .catch((cause: Error) => {
        if (active) setError(cause.message || (lang === 'en' ? 'Failed to load progress.' : 'Chưa tải được tiến độ học tập.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period, lang]);

  const calendarWeeks = useMemo(() => {
    const days = streak?.days ?? [];
    const offset = days.length ? (new Date(`${days[0].date}T12:00:00`).getDay() + 6) % 7 : 0;
    return [...Array.from({ length: offset }, () => null), ...days];
  }, [streak]);

  return (
    <main className="mx-auto min-h-[calc(100vh-76px)] max-w-7xl px-5 py-8 text-slate-900 md:px-8 md:py-10">
      {/* Header với nút quay lại trang chủ dạng Button đóng khung rõ ràng */}
      <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-base font-bold text-slate-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
            >
              <span aria-hidden="true" className="text-lg">←</span> {lang === 'en' ? 'Back to Home' : 'Quay lại trang chủ'}
            </Link>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
            {t('dashboard.title')}
          </h1>
          <p className="mt-2 text-base text-slate-600">
            {t('dashboard.desc')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/practice/dictation?mode=dictation"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-base font-bold text-white shadow-md transition hover:bg-blue-700"
          >
            {lang === 'en' ? 'Start practicing' : 'Bắt đầu luyện'} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      {loading && (
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-12 text-center text-base font-semibold text-slate-500 shadow-sm">
          {lang === 'en' ? 'Updating real-time progress metrics…' : 'Đang cập nhật số liệu tiến độ học tập theo thời gian thực…'}
        </div>
      )}

      {error && (
        <section role="alert" className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-6 text-base text-rose-800 shadow-sm">
          <strong className="text-lg font-bold">{lang === 'en' ? 'Failed to load progress data.' : 'Chưa tải được dữ liệu tiến độ.'}</strong>
          <p className="mt-1">{error}</p>
          <div className="mt-4">
            <Link href="/login" className="inline-flex rounded-xl bg-rose-600 px-5 py-2.5 font-bold text-white shadow hover:bg-rose-700">
              {lang === 'en' ? 'Sign in' : 'Đăng nhập tài khoản'}
            </Link>
          </div>
        </section>
      )}

      {!loading && !error && progress && (
        <>
          {/* 4 Thẻ tóm tắt thông số quan trọng */}
          <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Progress summary">
            <article className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:border-blue-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-600">{t('dashboard.study_time')}</span>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-xl font-bold text-blue-600">◷</span>
              </div>
              <strong className="mt-4 block text-4xl font-black text-slate-900 tracking-tight">
                {formatStudyTime(progress.summary.studySeconds, lang)}
              </strong>
            </article>

            <article className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:border-blue-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-600">{t('dashboard.accuracy')}</span>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-xl font-bold text-emerald-600">◎</span>
              </div>
              <strong className="mt-4 block text-4xl font-black text-slate-900 tracking-tight">
                {progress.summary.completedAttempts ? `${progress.summary.accuracyRate}%` : '—'}
              </strong>
            </article>

            <article className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 via-white to-white p-6 shadow-sm hover:border-orange-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-orange-900">{t('dashboard.streak')}</span>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-100 text-2xl font-bold">🔥</span>
              </div>
              <strong className="mt-4 block text-4xl font-black text-orange-600 tracking-tight">
                {streak?.currentStreak ?? progress.summary.currentStreak} {lang === 'en' ? 'days' : 'ngày'}
              </strong>
            </article>

            <article className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-white to-white p-6 shadow-sm hover:border-blue-400 transition">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-blue-900">{t('dashboard.points')}</span>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-xl font-bold text-blue-700">✦</span>
              </div>
              <strong className="mt-4 block text-4xl font-black text-blue-700 tracking-tight">
                {progress.summary.dailyPoints} {lang === 'en' ? 'pts' : 'điểm'}
              </strong>
            </article>
          </section>

          {/* Phần Biểu đồ tiến độ cột & Lịch chuyên cần */}
          <section className="grid gap-6 xl:grid-cols-[1.6fr_.9fr]">
            {/* Biểu đồ cột */}
            <article className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{t('dashboard.chart_title')}</h2>
                  <p className="mt-2 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
                    <span>{lang === 'en' ? 'X Axis: Attempts over time' : 'Trục X: Lượt luyện tập (theo thời gian)'}</span>
                    <span className="text-blue-300">|</span>
                    <span>{lang === 'en' ? 'Y Axis: Accuracy (%)' : 'Trục Y: Độ chính xác (%)'}</span>
                  </p>
                </div>
                <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1" role="group" aria-label="Period">
                  {periods.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setPeriod(item.value)}
                      aria-pressed={period === item.value}
                      className={`rounded-lg px-3.5 py-1.5 text-sm font-bold transition ${
                        period === item.value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <BarProgressChart data={progress.chart} period={period} lang={lang} />
            </article>

            {/* Lịch chuyên cần */}
            <article className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <h2 className="text-2xl font-bold text-slate-900">{t('dashboard.streak_title')}</h2>
                  <span className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-extrabold text-orange-700">
                    🔥 {streak?.currentStreak ?? progress.summary.currentStreak} {lang === 'en' ? 'days' : 'ngày'}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-extrabold uppercase text-slate-500">
                  {(lang === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']).map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>

                <div className="mt-2.5 grid grid-cols-7 gap-2" aria-label="Recent 35 days">
                  {calendarWeeks.map((day, index) =>
                    day ? (
                      <span
                        key={day.date}
                        title={`${formatDate(day.date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}${
                          day.isActive ? ` · ${day.dailyPoints} pts` : ` · ${lang === 'en' ? 'Not studied' : 'Chưa học'}`
                        }`}
                        className={`grid aspect-square place-items-center rounded-xl text-sm font-bold transition ${
                          day.isActive
                            ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200'
                            : 'border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {new Date(`${day.date}T12:00:00`).getDate()}
                      </span>
                    ) : (
                      <span key={`pad-${index}`} />
                    )
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-md bg-blue-600 shadow-sm" /> {lang === 'en' ? 'Studied' : 'Đã học'}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-md border border-slate-300 bg-slate-200" /> {lang === 'en' ? 'Not studied' : 'Chưa học'}
                </span>
              </div>
            </article>
          </section>
        </>
      )}
    </main>
  );
}

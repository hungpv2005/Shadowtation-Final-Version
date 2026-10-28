'use client';

import Link from 'next/link';
// lucide-react icons removed with pricing section
import { features } from './features';
import { useLanguage } from '@/lib/i18n';

const homeFeatureIds = ['uc-02', 'uc-04', 'uc-05', 'uc-06', 'uc-07'];

export default function Home() {
  const { lang, t } = useLanguage();
  const homeFeatures = homeFeatureIds.map((id) => features.find((feature) => feature.id === id)!).filter(Boolean);

  return (
    <main className="mx-auto max-w-7xl px-5 pb-16 pt-10 text-slate-900 dark:text-slate-100 md:px-8 md:pt-14">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-7 py-9 text-white shadow-xl md:px-12 md:py-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_.75fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.2em] text-blue-200">
              {t('home.eyebrow')}
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight md:text-5xl">
              {t('home.hero_title')}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100">
              {t('home.hero_desc')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/practice/dictation?mode=dictation"
                className="rounded-xl bg-white px-6 py-3 font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 text-base"
              >
                {t('home.cta_dictation')} <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/practice/dictation?mode=shadowing"
                className="rounded-xl border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10 text-base"
              >
                {t('home.cta_shadowing')} <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="#learning-features"
                className="rounded-xl border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10 text-base"
              >
                {t('home.cta_features')}
              </Link>
            </div>
          </div>
          <aside className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm md:p-7">
            <p className="text-sm font-bold uppercase tracking-wide text-blue-100">
              {t('home.roadmap_title')}
            </p>
            <ol className="mt-5 space-y-5">
              <li className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white font-bold text-blue-700">
                  1
                </span>
                <div>
                  <p className="font-bold text-base">{t('home.step1_title')}</p>
                  <p className="mt-1 text-sm leading-6 text-blue-100">
                    {t('home.step1_desc')}
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white font-bold text-blue-700">
                  2
                </span>
                <div>
                  <p className="font-bold text-base">{t('home.step2_title')}</p>
                  <p className="mt-1 text-sm leading-6 text-blue-100">
                    {t('home.step2_desc')}
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white font-bold text-blue-700">
                  3
                </span>
                <div>
                  <p className="font-bold text-base">{t('home.step3_title')}</p>
                  <p className="mt-1 text-sm leading-6 text-blue-100">
                    {t('home.step3_desc')}
                  </p>
                </div>
              </li>
            </ol>
          </aside>
        </div>
      </section>

      <section id="learning-features" className="pt-14">
        <div className="mx-auto mb-7 max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-blue-600 dark:text-blue-400">
            {t('home.workspace_eyebrow')}
          </p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl text-slate-900 dark:text-slate-100">
            {t('home.workspace_title')}
          </h2>
          <p className="mt-3 text-lg leading-7 text-slate-600 dark:text-slate-400">
            {t('home.workspace_desc')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-6">
          {homeFeatures.map((feature, index) => (
            <Link
              key={feature.id}
              href={feature.href}
              className={`group rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-xl ${
                index < 3 ? 'xl:col-span-2' : 'xl:col-span-3'
              }`}
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-2xl font-bold text-blue-700 dark:text-blue-400 transition group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60">
                {feature.icon}
              </span>
              <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-slate-100">
                {lang === 'en' ? (feature.enTitle ?? feature.title) : feature.title}
              </h3>
              <p className="mt-2 min-h-14 leading-7 text-slate-600 dark:text-slate-400 text-base">
                {lang === 'en' ? (feature.enDescription ?? feature.description) : feature.description}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 font-bold text-blue-700 dark:text-blue-400 text-base">
                {t('home.open_feature')}{' '}
                <span aria-hidden="true" className="transition group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 flex flex-col items-start justify-between gap-5 rounded-2xl border-2 border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-slate-800/90 p-6 md:flex-row md:items-center md:p-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('home.bottom_title')}</h2>
          <p className="mt-1 text-slate-600 dark:text-slate-300 text-base">
            {t('home.bottom_desc')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/practice/dictation?mode=dictation"
            className="shrink-0 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 text-base shadow-sm"
          >
            {t('home.cta_dictation')}
          </Link>
          <Link
            href="/practice/dictation?mode=shadowing"
            className="shrink-0 rounded-xl border-2 border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3 font-bold text-blue-700 dark:text-blue-400 hover:bg-blue-50 text-base shadow-sm"
          >
            {t('home.cta_shadowing')}
          </Link>
        </div>
      </section>
    </main>
  );
}

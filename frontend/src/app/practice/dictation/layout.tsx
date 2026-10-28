import { Suspense, type ReactNode } from 'react';

export default function DictationLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<main className="mx-auto grid min-h-[60vh] max-w-5xl place-items-center px-5 text-sm font-semibold text-slate-500">Đang mở không gian luyện tập…</main>}>
    {children}
  </Suspense>;
}

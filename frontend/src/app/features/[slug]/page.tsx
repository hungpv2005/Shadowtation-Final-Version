import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { features } from '../../features';
import ReviewListPage from '../../review-list-page';

export default function FeaturePage({ params }: { params: { slug: string } }) {
  const feature = features.find((item) => item.id === params.slug);
  if (!feature) notFound();

  if (feature.id === 'uc-01') redirect('/login');
  if (feature.id === 'uc-06') redirect('/dashboard');
  if (feature.id === 'uc-07') redirect('/vocabulary');
  if (feature.id === 'uc-10') redirect('/subscription');

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 md:py-14">
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-base font-bold text-slate-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
      >
        <span aria-hidden="true" className="text-lg">←</span> Quay lại trang chủ
      </Link>

      <section className="mt-8 rounded-3xl border-2 border-slate-200 bg-white p-8 shadow-lg md:p-12">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-3xl font-bold text-blue-700">
          {feature.icon}
        </span>
        <p className="mt-6 text-sm font-bold uppercase tracking-wider text-blue-600">
          {feature.category}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900 md:text-4xl">
          {feature.title}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-slate-600">
          {feature.description}
        </p>

        {feature.available ? (
          <div className="mt-8 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800">
            Chức năng đã sẵn sàng để bạn sử dụng và luyện tập.
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border-2 border-blue-100 bg-blue-50 p-5 text-blue-900">
            <strong className="block text-base font-bold">Chức năng trong lộ trình phát triển</strong>
            <p className="mt-1 text-sm leading-relaxed text-blue-800">
              Giao diện và nghiệp vụ đang được hoàn thiện để mang đến trải nghiệm học tiếng Anh mượt mà nhất cho bạn.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-4 pt-4 border-t border-slate-100">
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-md transition hover:bg-blue-700 text-base"
            href={
              feature.id === 'uc-10'
                ? '/subscription'
                : feature.id === 'uc-05'
                ? '/practice/shadowing/results'
                : '/practice/dictation'
            }
          >
            {feature.id === 'uc-10'
              ? 'Xem các gói học'
              : feature.id === 'uc-05'
              ? 'Xem kết quả phát âm AI'
              : 'Mở danh sách bài học'}{' '}
            <span aria-hidden="true">→</span>
          </Link>
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-slate-200 bg-slate-50 px-6 py-3 font-bold text-slate-700 transition hover:bg-slate-100 text-base"
            href="/"
          >
            Khám phá chức năng khác
          </Link>
        </div>
      </section>
    </main>
  );
}

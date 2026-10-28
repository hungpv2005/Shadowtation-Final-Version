'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore, UserProfile } from '@/lib/auth-store';
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

type RegisterResponse = {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
};

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      const data = await apiFetch<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password }),
      });

      setAuth(data.user, data.accessToken, data.refreshToken, true);
      router.push('/practice/dictation?mode=dictation');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Không thể tạo tài khoản. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
    window.location.href = `${apiUrl}/auth/google`;
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-70px)] max-w-5xl items-center px-4 py-10 md:py-16">
      <div className="grid w-full overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl md:grid-cols-12">
        {/* Cột trái: Lợi ích khi tham gia */}
        <section className="relative flex flex-col justify-between bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-8 text-white md:col-span-5 md:p-10">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-100 hover:text-white">
              <span>←</span> Về trang chủ
            </Link>

            <div className="mt-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-indigo-100 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Bắt đầu miễn phí
              </span>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-white md:text-3xl">
                Tạo tài khoản học viên
              </h1>
              <p className="mt-3 text-sm leading-6 text-indigo-100">
                Gia nhập nền tảng luyện phản xạ nghe chép và nói chuẩn ngữ điệu tiếng Anh cùng hàng ngàn học viên.
              </p>
            </div>

            <ul className="mt-8 space-y-3.5 text-sm text-indigo-100">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>Không yêu cầu thẻ tín dụng khi đăng ký.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>Kho bài tập đa dạng phân theo trình độ A1 – C1.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>Tự động đồng bộ bài tập nháp trên mọi thiết bị.</span>
              </li>
            </ul>
          </div>

          <div className="mt-10 rounded-2xl border border-white/20 bg-white/10 p-4 text-xs text-indigo-100 backdrop-blur-sm">
            <p className="font-semibold text-white">Chính sách bảo mật</p>
            <p className="mt-1 text-indigo-200">
              Thông tin của bạn được mã hóa an toàn và chỉ sử dụng cho mục đích cá nhân hóa trải nghiệm học tập.
            </p>
          </div>
        </section>

        {/* Cột phải: Form đăng ký */}
        <section className="flex flex-col justify-center p-8 md:col-span-7 md:p-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Khởi đầu thuận lợi</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
              Đăng ký tài khoản
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Đã có tài khoản?{' '}
              <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Đăng nhập tại đây
              </Link>
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Google Button */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            >
              <GoogleIcon />
              <span>Đăng ký nhanh với Google</span>
            </button>
          </div>

          <div className="relative my-6 flex items-center">
            <div className="w-full border-t border-slate-200" />
            <span className="absolute left-1/2 -translate-x-1/2 bg-white px-3 text-xs font-semibold text-slate-400">
              HOẶC ĐIỀN THÔNG TIN
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Họ và tên
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  id="fullName"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Email
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Mật khẩu (tối thiểu 6 ký tự)
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Xác nhận mật khẩu
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:opacity-60"
            >
              {loading ? (
                <span>Đang khởi tạo tài khoản…</span>
              ) : (
                <>
                  <span>Hoàn tất đăng ký</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

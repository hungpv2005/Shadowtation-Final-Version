'use client';

import { Suspense, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore, UserProfile } from '@/lib/auth-store';
import { Headphones, Eye, EyeOff, Lock, Mail, ArrowRight, Sparkles, CheckCircle2, ShieldCheck, User } from 'lucide-react';

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

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
};

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const urlError = searchParams.get('error');

  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError || null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const data = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (data.user.role === 'ADMIN') {
        const refreshToken = data.refreshToken;
        if (refreshToken) {
          void apiFetch('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          }).catch(() => undefined);
        }
        setError('Tài khoản này là Quản trị viên (Admin). Cổng đăng nhập này chỉ dành riêng cho học viên. Quản trị viên vui lòng truy cập đường dẫn Cổng Quản Trị riêng biệt.');
        return;
      }

      setAuth(data.user, data.accessToken, data.refreshToken, rememberMe);
      router.push(redirectUrl);
      router.refresh();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 429) {
        setError('Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng đợi 1 phút rồi thử lại.');
      } else {
        setError(err.message || 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
      }
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
        {/* Cột trái: Giới thiệu thương hiệu */}
        <section className="relative flex flex-col justify-between bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-8 text-white md:col-span-5 md:p-10">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-100 hover:text-white">
              <span>←</span> Về trang chủ
            </Link>

            <div className="mt-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-indigo-100 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Nền tảng học tiếng Anh
              </span>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-white md:text-3xl">
                Shadowtation
              </h1>
              <p className="mt-3 text-sm leading-6 text-indigo-100">
                Luyện nghe Dictation và Shadowing với công nghệ chấm phát âm AI chuẩn xác đến từng từ.
              </p>
            </div>

            <ul className="mt-8 space-y-3.5 text-sm text-indigo-100">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>Chép chính tả thời gian thực theo từng câu thoại.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>AI Azure chấm phát âm độ chính xác cao.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>Lưu chuỗi streak và tiến độ học tập cá nhân.</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-4 text-xs text-indigo-100 backdrop-blur-sm space-y-2">
            <p className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Tài khoản học viên demo:</span>
            </p>
            <div
              onClick={() => {
                setEmail('student@shadowtation.local');
                setPassword('Student@123456');
              }}
              className="group cursor-pointer rounded-xl bg-black/20 p-2.5 transition hover:bg-black/30 border border-white/10"
              title="Bấm để tự động điền tài khoản Học viên"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-300 flex items-center gap-1">
                  <User className="h-3 w-3" /> Học viên (Student)
                </span>
                <span className="text-[10px] text-indigo-200 group-hover:underline">Bấm để điền ↵</span>
              </div>
              <p className="mt-0.5 font-mono text-[11px] text-white">student@shadowtation.local / Student@123456</p>
            </div>
          </div>
        </section>

        {/* Cột phải: Form đăng nhập */}
        <section className="flex flex-col justify-center p-8 md:col-span-7 md:p-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Chào mừng trở lại</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
              Đăng nhập tài khoản
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Chưa có tài khoản?{' '}
              <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Đăng ký ngay miễn phí
              </Link>
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Nút đăng nhập Google */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            >
              <GoogleIcon />
              <span>Tiếp tục với Google</span>
            </button>
          </div>

          <div className="relative my-6 flex items-center">
            <div className="w-full border-t border-slate-200" />
            <span className="absolute left-1/2 -translate-x-1/2 bg-white px-3 text-xs font-semibold text-slate-400">
              HOẶC DÙNG EMAIL
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Tài khoản mẫu:</span>
              <button
                type="button"
                onClick={() => {
                  setEmail('student@shadowtation.local');
                  setPassword('Student@123456');
                }}
                className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition"
              >
                Điền nhanh Học viên demo
              </button>
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
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Mật khẩu
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
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

            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-600">Ghi nhớ đăng nhập trên thiết bị này</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:opacity-60"
            >
              {loading ? (
                <span>Đang đăng nhập…</span>
              ) : (
                <>
                  <span>Đăng nhập</span>
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm font-semibold text-slate-500">Đang tải trang đăng nhập…</p>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}

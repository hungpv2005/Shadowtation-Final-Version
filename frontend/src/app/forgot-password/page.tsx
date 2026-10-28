'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const data = await apiFetch<{ message: string; resetToken?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      setSuccess(true);
      setMessage(data.message || 'Hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn.');
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể xử lý yêu cầu. Vui lòng kiểm tra lại email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-70px)] max-w-xl items-center px-4 py-12">
      <div className="w-full rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xl md:p-10">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
        </Link>

        <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <KeyRound className="h-6 w-6" />
        </div>

        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
          Quên mật khẩu?
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Nhập địa chỉ email đăng ký tài khoản học viên để nhận hướng dẫn khôi phục mật khẩu.
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {success ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Yêu cầu thành công</span>
              </div>
              <p className="mt-2 text-emerald-800">{message}</p>
            </div>

            {resetToken && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 text-xs text-indigo-900">
                <p className="font-bold">Mã Reset Token (Môi trường Dev/Test):</p>
                <p className="mt-1 break-all font-mono font-semibold text-indigo-700">{resetToken}</p>
                <div className="mt-4">
                  <Link
                    href={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-indigo-700"
                  >
                    <span>Mở trang đặt lại mật khẩu ngay</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}

            <div className="pt-4 text-center">
              <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
                ← Về trang đăng nhập
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Địa chỉ Email
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

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:opacity-60"
            >
              {loading ? (
                <span>Đang gửi mã…</span>
              ) : (
                <>
                  <span>Gửi yêu cầu khôi phục</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

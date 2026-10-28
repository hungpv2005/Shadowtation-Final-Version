'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuthStore, UserProfile } from '@/lib/auth-store';
import { Sparkles, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const urlError = searchParams.get('error');

    if (urlError) {
      setError(urlError);
      return;
    }

    if (!accessToken || !refreshToken) {
      setError('Không nhận được token xác thực từ máy chủ Google.');
      return;
    }

    // Tạm thời lưu token để gọi apiFetch
    localStorage.setItem('access_token', accessToken);
    sessionStorage.setItem('access_token', accessToken);

    // Lấy thông tin user profile
    apiFetch<UserProfile>('/auth/me')
      .then((user) => {
        setAuth(user, accessToken, refreshToken, true);
        if (user.role === 'ADMIN') {
          router.replace('/admin');
        } else {
          router.replace('/');
        }
      })
      .catch((err) => {
        setError(err.message || 'Lỗi khi đồng bộ thông tin tài khoản Google.');
      });
  }, [searchParams, router, setAuth]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
        <div className="w-full rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Xác thực Google thất bại</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
            >
              Quay lại trang đăng nhập
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
      <div className="w-full rounded-3xl border border-slate-200/90 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Đang hoàn tất đăng nhập…</h1>
        <p className="mt-2 text-sm text-slate-500">
          Vui lòng đợi giây lát trong khi chúng tôi đồng bộ phiên làm việc của bạn.
        </p>
      </div>
    </main>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm font-semibold text-slate-500">Đang xử lý đăng nhập Google…</p>
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}

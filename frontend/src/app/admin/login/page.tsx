'use client';

import { Suspense, useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore, UserProfile } from '@/lib/auth-store';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertTriangle,
  Server,
  Database,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
};

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/admin';
  const urlError = searchParams.get('error');

  const authUser = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const logoutStore = useAuthStore((state) => state.logout);

  const [email, setEmail] = useState('admin@shadowtation.local');
  const [password, setPassword] = useState('Admin@123456');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError === 'unauthorized'
      ? 'Bạn cần đăng nhập bằng tài khoản Quản trị viên để tiếp tục.'
      : urlError || null,
  );

  // Nếu đã đăng nhập là ADMIN rồi thì chuyển thẳng vào /admin
  useEffect(() => {
    if (authUser?.role === 'ADMIN') {
      router.replace(redirectUrl.startsWith('/admin') ? redirectUrl : '/admin');
    }
  }, [authUser, redirectUrl, router]);

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

      // Kiểm tra nghiêm ngặt: Chỉ cho phép role ADMIN
      if (data.user.role !== 'ADMIN') {
        // Đăng xuất ngay phiên làm việc này
        const refreshToken = data.refreshToken;
        if (refreshToken) {
          void apiFetch('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          }).catch(() => undefined);
        }
        logoutStore();
        setError(
          `Từ chối truy cập: Tài khoản (${data.user.email}) có vai trò ${data.user.role}, không có thẩm quyền Quản trị viên hệ thống.`,
        );
        return;
      }

      // Lưu phiên đăng nhập hợp lệ của Admin
      setAuth(data.user, data.accessToken, data.refreshToken, rememberMe);
      router.push(redirectUrl.startsWith('/admin') ? redirectUrl : '/admin');
      router.refresh();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 429) {
        setError('Đã gửi quá nhiều yêu cầu đăng nhập sai. Vui lòng chờ 1 phút.');
      } else {
        setError(err.message || 'Email hoặc mật khẩu Quản trị không chính xác.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-indigo-600/10 blur-[140px]" />
        <div className="absolute bottom-0 right-10 h-[350px] w-[350px] rounded-full bg-rose-600/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Top Header & Badge */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-bold text-indigo-400 backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
            <span>SHADOWTATION CONTROL PORTAL</span>
          </div>

          <h1 className="mt-4 text-2xl font-black tracking-tight text-white md:text-3xl">
            Cổng Quản Trị Hệ Thống
          </h1>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Khu vực giới hạn bảo mật cao dành riêng cho Quản trị viên (Admin) quản lý bài học, doanh thu và hạ tầng.
          </p>
        </div>

        {/* Login Box */}
        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-7 shadow-2xl backdrop-blur-xl md:p-8">
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-900/60 bg-rose-950/40 p-4 text-xs text-rose-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <div className="min-w-0 flex-1 leading-5">{error}</div>
            </div>
          )}

          {/* Quick autofill pill for evaluation */}
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
                <span>Tài khoản Admin mẫu:</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@shadowtation.local');
                  setPassword('Admin@123456');
                }}
                className="rounded-lg bg-indigo-600/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 hover:bg-indigo-600/30 transition"
              >
                Tự động điền ↵
              </button>
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-slate-400 select-all">
              admin@shadowtation.local / Admin@123456
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Tài khoản Email Quản trị
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="admin@shadowtation.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-600 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Mật khẩu Quản trị
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-600 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300"
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
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                />
                <span className="text-xs text-slate-400">Duy trì phiên đăng nhập</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:from-indigo-500 hover:to-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 disabled:opacity-50"
            >
              {loading ? (
                <span>Đang xác thực thông tin Quản trị…</span>
              ) : (
                <>
                  <span>Xác thực & Vào Cổng Quản Trị</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* System Capabilities info footer */}
          <div className="mt-6 border-t border-slate-800/80 pt-4">
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <Database className="h-3 w-3 text-slate-400" />
                <span>PostgreSQL & Redis DB</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Server className="h-3 w-3 text-slate-400" />
                <span>Azure Speech & VNPAY</span>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
          <p className="text-xs font-semibold">Đang tải Cổng Quản trị…</p>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}

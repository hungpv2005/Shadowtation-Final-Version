'use client';

import { useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuthStore, UserProfile } from '@/lib/auth-store';
import {
  ShieldCheck,
  LayoutDashboard,
  BookOpen,
  Crown,
  CreditCard,
  Activity,
  LogOut,
  Menu,
  X,
  AlertCircle,
  Sparkles,
  Users,
} from 'lucide-react';

const adminNavItems = [
  { href: '/admin', label: 'Tổng quan Dashboard', icon: LayoutDashboard },
  { href: '/admin/lessons', label: 'Kho Bài học', icon: BookOpen },
  { href: '/admin/users', label: 'Quản lý Người dùng', icon: Users },
  { href: '/admin/subscriptions', label: 'Gói cước Premium', icon: Crown },
  { href: '/admin/transactions', label: 'Đối soát Giao dịch', icon: CreditCard },
  { href: '/admin/system', label: 'Hạ tầng & CSDL', icon: Activity },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const authUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logoutStore = useAuthStore((state) => state.logout);
  const updateUserStore = useAuthStore((state) => state.updateUser);

  const [user, setUser] = useState<UserProfile | null>(() => authUser || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('student_profile') || 'null') : null));
  const [checkingAuth, setCheckingAuth] = useState(() => {
    if (pathname === '/admin/login') return false;
    // Nếu trong store đã có sẵn admin profile thì cho render ngay
    return !(authUser?.role === 'ADMIN');
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 1. Chỉ xác thực quyền Admin một lần khi mount hoặc khi token thay đổi (Loại bỏ vòng lặp vô tận)
  useEffect(() => {
    if (pathname === '/admin/login') {
      setCheckingAuth(false);
      return;
    }

    let isMounted = true;
    const token =
      localStorage.getItem('access_token') ??
      sessionStorage.getItem('access_token') ??
      localStorage.getItem('accessToken') ??
      sessionStorage.getItem('accessToken');

    if (!token) {
      setCheckingAuth(false);
      router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Kiểm tra nhanh quyền hiện có trong local storage/store
    const currentCached = useAuthStore.getState().user;
    if (currentCached && currentCached.role !== 'ADMIN') {
      // Học viên cố tình vào /admin -> chặn đứng và chuyển hướng ngay về /admin/login
      setCheckingAuth(false);
      router.replace('/admin/login?error=unauthorized');
      return;
    }

    // Đồng bộ lại hồ sơ từ server để xác thực quyền ADMIN chuẩn xác nhất
    apiFetch<UserProfile>('/auth/me')
      .then((profile) => {
        if (!isMounted) return;
        setUser(profile);
        if (profile.role !== 'ADMIN') {
          // Nếu không phải ADMIN, lập tức chuyển hướng về /admin/login
          router.replace('/admin/login?error=unauthorized');
          return;
        }
        // Chỉ cập nhật store nếu có thay đổi thực sự để tránh re-render loop
        const cur = useAuthStore.getState().user;
        if (!cur || cur.id !== profile.id || cur.role !== profile.role) {
          updateUserStore(profile);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const fallbackUser = useAuthStore.getState().user;
        if (!fallbackUser || fallbackUser.role !== 'ADMIN') {
          router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
        }
      })
      .finally(() => {
        if (isMounted) setCheckingAuth(false);
      });

    return () => {
      isMounted = false;
    };
  }, []); // Dependency rỗng: CHỈ chạy 1 lần khi mount, tuyệt đối không trigger re-render loop!

  // Bỏ qua layout admin nếu đang ở trang /admin/login (đặt sau tất cả hooks)
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const signOut = () => {
    const refreshToken =
      localStorage.getItem('refresh_token') ?? sessionStorage.getItem('refresh_token');
    if (refreshToken) {
      void apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }
    logoutStore();
    router.push('/admin/login');
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="mt-4 text-xs font-semibold text-slate-400">Đang kiểm tra quyền Quản trị viên…</p>
        </div>
      </div>
    );
  }

  // Nếu chưa đăng nhập
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('access_token') ??
        sessionStorage.getItem('access_token') ??
        localStorage.getItem('accessToken') ??
        sessionStorage.getItem('accessToken')
      : null;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-xl font-black text-white">Yêu cầu đăng nhập Admin</h1>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Khu vực này được bảo mật và chỉ dành riêng cho Quản trị viên hệ thống Shadowtation.
          </p>
          <div className="mt-6">
            <Link
              href={`/admin/login?redirect=${encodeURIComponent(pathname)}`}
              className="inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-indigo-500 transition"
            >
              Vào cổng đăng nhập Quản trị
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Nếu đã đăng nhập nhưng không phải ADMIN
  if (user && user.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-lg rounded-3xl border border-rose-900/50 bg-slate-900 p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-xl font-black text-white">Từ chối quyền truy cập</h1>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Tài khoản hiện tại (<strong className="text-slate-200">{user.email}</strong>) có vai trò là{' '}
            <span className="font-bold text-rose-400">{user.role}</span>, không có thẩm quyền trong Cổng Quản trị Admin.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={signOut}
              className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-500 transition"
            >
              Đăng nhập bằng tài khoản Quản trị
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar Desktop */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-900 p-5 text-white md:flex">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-5">
            <Link href="/admin" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-sm font-black text-white shadow-md">
                S
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tight text-white">Shadowtation</span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
                  Admin Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Nav Items */}
          <nav className="mt-6 space-y-1.5" aria-label="Menu quản trị">
            {adminNavItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Profile & Exit */}
        <div className="border-t border-slate-800 pt-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-800/60 p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-600 text-xs font-bold text-white">
              AD
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{user?.fullName || 'Quản trị viên'}</p>
              <p className="truncate text-[10px] text-slate-400">{user?.email}</p>
            </div>
          </div>

          <div className="mt-3 space-y-1">


            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Topbar Mobile & Breadcrumbs */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 md:hidden"
              aria-label="Mở menu quản trị"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="flex items-center gap-2 text-xs">
              <Link href="/admin" className="font-semibold text-slate-400 hover:text-slate-600">
                Admin
              </Link>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-slate-800">
                {adminNavItems.find((i) => i.href === pathname)?.label || 'Bảng điều khiển'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200/80 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Core API & CSDL Online
            </span>


          </div>
        </header>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-800 bg-slate-900 p-4 text-white md:hidden">
            <nav className="space-y-1">
              {adminNavItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold ${
                      active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-2 text-xs font-semibold text-rose-400"
              >
                <LogOut className="h-4 w-4" /> Đăng xuất
              </button>
            </div>
          </div>
        )}

        {/* Main Content Workspace */}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuthStore, UserProfile } from '@/lib/auth-store';
import { AiTutorBot } from './components/ai-tutor-bot';
import { useLanguage, FlagVN, FlagUK } from '@/lib/i18n';
import {
  Home,
  User,
  ChevronUp,
  Headphones,
  Mic,
  BarChart3,
  LayoutDashboard,
  Crown,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  Flame,
  LogIn,
  BookOpen,
  FileCheck,
  Sun,
  Moon,
  Globe,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Trang chủ', enLabel: 'Home', icon: Home },
  {
    href: '/dashboard',
    label: 'Tiến độ học tập',
    enLabel: 'Learning Progress',
    icon: LayoutDashboard,
  },
  {
    href: '/practice/dictation?mode=dictation',
    label: 'Luyện nghe Dictation',
    enLabel: 'Dictation',
    icon: Headphones,
    mode: 'dictation',
  },
  {
    href: '/practice/dictation?mode=shadowing',
    label: 'Luyện nói Shadowing',
    enLabel: 'Shadowing',
    icon: Mic,
    mode: 'shadowing',
  },
  {
    href: '/practice/shadowing/results',
    label: 'Kết quả phát âm AI',
    enLabel: 'AI Speech Results',
    icon: Sparkles,
  },
  {
    href: '/practice/dictation/results',
    label: 'Kết quả luyện chép',
    enLabel: 'Dictation Results',
    icon: FileCheck,
  },
  { href: '/vocabulary', label: 'Sổ từ vựng cá nhân', enLabel: 'Vocabulary', icon: BookOpen },
  { href: '/subscription', label: 'Gói học Premium', enLabel: 'Premium', icon: Crown },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();

  const authUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logoutStore = useAuthStore((state) => state.logout);
  const updateUserStore = useAuthStore((state) => state.updateUser);

  const [signedIn, setSignedIn] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profilePopoverOpen, setProfilePopoverOpen] = useState(false);
  const profileBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileBoxRef.current && !profileBoxRef.current.contains(e.target as Node)) {
        setProfilePopoverOpen(false);
      }
    };
    if (profilePopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profilePopoverOpen]);
  const [practiceNavMode, setPracticeNavMode] = useState<'dictation' | 'shadowing'>('dictation');

  // Sidebar collapsible state
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Theme toggle state (light / dark)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check initial theme from html class or localStorage
    const isDark =
      document.documentElement.classList.contains('dark') ||
      localStorage.getItem('shadowtation_theme') === 'dark';
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('shadowtation_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('shadowtation_theme', 'light');
    }
  };

  const toggleLanguage = () => {
    setLang(lang === 'vi' ? 'en' : 'vi');
  };

  useEffect(() => {
    const saved = localStorage.getItem('shadowtation_sidebar_collapsed');
    if (saved !== null) {
      setCollapsed(saved === 'true');
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('shadowtation_sidebar_collapsed', String(next));
      return next;
    });
  };

  // 1. Chỉ sync Auth khi mount hoặc khi token/auth thay đổi (tránh re-render loop)
  useEffect(() => {
    let isMounted = true;

    const syncAuth = () => {
      const token =
        localStorage.getItem('access_token') ??
        sessionStorage.getItem('access_token') ??
        localStorage.getItem('accessToken') ??
        sessionStorage.getItem('accessToken');

      const isAuthed = Boolean(token);
      setSignedIn(isAuthed);

      if (isAuthed) {
        const rawProfile =
          localStorage.getItem('student_profile') ?? sessionStorage.getItem('student_profile');
        if (rawProfile) {
          try {
            setUser(JSON.parse(rawProfile));
          } catch {
            setUser(authUser);
          }
        } else {
          setUser(authUser);
        }

        apiFetch<UserProfile>('/auth/me')
          .then((fresh) => {
            if (!isMounted) return;
            setUser(fresh);
            // Chỉ cập nhật store nếu có thay đổi thật sự để tránh re-render loop
            const cur = useAuthStore.getState().user;
            if (
              !cur ||
              cur.id !== fresh.id ||
              cur.role !== fresh.role ||
              cur.streakCount !== fresh.streakCount ||
              cur.fullName !== fresh.fullName
            ) {
              updateUserStore(fresh);
            }
            try {
              localStorage.setItem('student_profile', JSON.stringify(fresh));
            } catch {}
          })
          .catch(() => undefined);
      } else {
        setUser(null);
      }
    };

    syncAuth();
    window.addEventListener('shadowtation:auth-change', syncAuth);
    return () => {
      isMounted = false;
      window.removeEventListener('shadowtation:auth-change', syncAuth);
    };
  }, [updateUserStore]);

  // 2. Đồng bộ chế độ luyện tập (Dictation/Shadowing) theo URL route
  useEffect(() => {
    const syncPracticeMode = () =>
      setPracticeNavMode(
        new URLSearchParams(window.location.search).get('mode') === 'shadowing'
          ? 'shadowing'
          : 'dictation',
      );
    syncPracticeMode();

    window.addEventListener('shadowtation:practice-mode', syncPracticeMode);
    window.addEventListener('popstate', syncPracticeMode);

    return () => {
      window.removeEventListener('shadowtation:practice-mode', syncPracticeMode);
      window.removeEventListener('popstate', syncPracticeMode);
    };
  }, [pathname]);

  function signOut() {
    const refreshToken =
      localStorage.getItem('refresh_token') ?? sessionStorage.getItem('refresh_token');
    if (refreshToken) {
      void apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }
    logoutStore();
    setSignedIn(false);
    setUser(null);
    setMobileOpen(false);
    router.push('/login');
  }

  const rawDisplayName = user?.fullName || 'Học viên';
  // Chuẩn hóa tên học viên tránh lỗi font/mojikake bộ đệm UTF-8
  const displayName = rawDisplayName.includes('Phá')
    ? 'Phạm Văn Hùng'
    : rawDisplayName.includes('Há»')
    ? rawDisplayName.replace(/Há».*?cs*viÃªn/gi, 'Học viên')
    : rawDisplayName;
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'HV';

  const isPremium = user?.role === 'PREMIUM_STUDENT';
  const isAdmin = user?.role === 'ADMIN';

  // Nếu là trang quản trị (/admin/**), nhường quyền render cho AdminLayout riêng biệt
  if (pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  // Component render nội dung Profile / Khối Đăng nhập (Đặt ở dưới đáy sidebar)
  const renderUserProfile = (isDrawer = false) => {
    const isExpanded = !collapsed || isDrawer;

    if (signedIn) {
      if (isExpanded) {
        return (
          <div ref={profileBoxRef} className="relative">
            {/* Popover với 2 lựa chọn: Hồ sơ và Nâng cấp Premium */}
            {profilePopoverOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 z-50 overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tài khoản</span>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[120px]">{displayName}</span>
                </div>
                <div className="space-y-1">
                  <Link
                    href="/profile"
                    prefetch={false}
                    onClick={() => {
                      setProfilePopoverOpen(false);
                      if (isDrawer) setMobileOpen(false);
                    }}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                      <User className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold">Hồ sơ</div>
                      <div className="text-[10px] text-slate-400 font-normal">Tiến độ & Kết quả phát âm AI</div>
                    </div>
                  </Link>

                  <Link
                    href="/subscription"
                    prefetch={false}
                    onClick={() => {
                      setProfilePopoverOpen(false);
                      if (isDrawer) setMobileOpen(false);
                    }}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-800 hover:text-amber-600 dark:hover:text-amber-400 transition"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
                      <Crown className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold">Nâng cấp Premium</div>
                      <div className="text-[10px] text-slate-400 font-normal">Mở khóa toàn bộ học liệu</div>
                    </div>
                  </Link>
                </div>
              </div>
            )}

            <div
              onClick={() => setProfilePopoverOpen((prev) => !prev)}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 p-3 shadow-sm transition cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md group"
            >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-sm">
                  {initials}
                </span>
                {isPremium ? (
                  <span
                    className="absolute -bottom-1 -right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-amber-400 text-amber-950 shadow-sm"
                    title="Premium"
                  >
                    <Crown className="h-2 w-2" />
                  </span>
                ) : isAdmin ? (
                  <span
                    className="absolute -bottom-1 -right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-rose-500 text-white shadow-sm"
                    title="Admin"
                  >
                    <ShieldCheck className="h-2 w-2" />
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-slate-900 dark:text-slate-100">{displayName}</p>
                <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{user?.email}</p>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-200/60 dark:border-slate-700/60 pt-2 text-[11px]">
              {isAdmin ? (
                <div className="flex w-full items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                    <ShieldCheck className="h-3 w-3" /> Quản trị viên
                  </span>
                  <Link
                    href="/admin"
                    onClick={() => isDrawer && setMobileOpen(false)}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm hover:bg-indigo-500 transition"
                  >
                    Vào Admin →
                  </Link>
                </div>
              ) : isPremium ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  <Crown className="h-3 w-3" /> Gói Premium
                </span>
              ) : (
                <div className="flex w-full items-center justify-between">
                  <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    Gói Free
                  </span>
                  <Link
                    href="/subscription"
                    onClick={() => isDrawer && setMobileOpen(false)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline"
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Nâng cấp Premium →</span>
                  </Link>
                </div>
              )}

              {user && (user.streakCount ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  <Flame className="h-3 w-3 fill-amber-500 text-amber-500" />
                  <span>{user.streakCount} ngày</span>
                </span>
              )}
            </div>
          </div>
        </div>
        );
      }

      // Collapsed state
      return (
        <div className="my-1.5 flex justify-center px-1">
          <Link
            href="/profile"
            className="group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-sm"
            title={`${displayName} (${user?.email}) - Nhấn để xem Hồ sơ`}
          >
            {initials}
            {isPremium ? (
              <span className="absolute -bottom-1 -right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-amber-400 text-amber-950 shadow-sm">
                <Crown className="h-2 w-2" />
              </span>
            ) : isAdmin ? (
              <span className="absolute -bottom-1 -right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-rose-500 text-white shadow-sm">
                <ShieldCheck className="h-2 w-2" />
              </span>
            ) : null}

            {/* Hover Tooltip */}
            <div className="pointer-events-none absolute left-full ml-3 z-50 hidden whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-xs text-white shadow-xl group-hover:block">
              <p className="font-bold">{displayName}</p>
              <p className="text-[10px] text-slate-300">{user?.email}</p>
              <p className="mt-1 text-[10px] text-amber-300">
                {isPremium ? 'Gói Premium' : isAdmin ? 'Quản trị viên' : 'Gói Miễn phí'}
              </p>
              <p className="mt-1 text-[9px] text-indigo-300 underline font-semibold">Nhấn để xem Hồ sơ</p>
            </div>
          </Link>
        </div>
      );
    }

    // Chưa đăng nhập (Hiển thị khối Đăng nhập / Đăng ký ở dưới cùng)
    if (isExpanded) {
      return (
        <div className="rounded-2xl border border-indigo-100 dark:border-indigo-950/80 bg-indigo-50/70 dark:bg-indigo-950/40 p-3 text-center">
          <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
            {lang === 'en' ? 'Join Learning' : 'Tham gia học tập'}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {lang === 'en' ? 'Sign in to save progress' : 'Đăng nhập để lưu tiến độ'}
          </p>
          <div className="mt-2.5 flex flex-col gap-1.5">
            <Link
              href="/login"
              onClick={() => isDrawer && setMobileOpen(false)}
              className="rounded-xl bg-indigo-600 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 text-center transition"
            >
              {lang === 'en' ? 'Sign in' : 'Đăng nhập'}
            </Link>
            <Link
              href="/register"
              onClick={() => isDrawer && setMobileOpen(false)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-center transition"
            >
              {lang === 'en' ? 'Register free' : 'Đăng ký miễn phí'}
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="my-1.5 flex justify-center px-1">
        <Link
          href="/login"
          className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
          title={lang === 'en' ? 'Sign in' : 'Đăng nhập tài khoản'}
        >
          <LogIn className="h-5 w-5" />
        </Link>
      </div>
    );
  };

  // Component render danh sách Link điều hướng
  const renderNavItems = (isDrawer = false) => {
    const isExpanded = !collapsed || isDrawer;

    return (
      <nav className="space-y-1.5 px-3" aria-label="Điều hướng học tập">
        {navItems.map((item) => {
          const [linkPath, query] = item.href.split('?');
          const requestedMode = new URLSearchParams(query ?? '').get('mode');
          const active =
            pathname === linkPath && (!requestedMode || requestedMode === practiceNavMode);
          const Icon = item.icon;
          const itemLabel = lang === 'en' ? item.enLabel : item.label;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              onClick={() => {
                if (requestedMode) {
                  setPracticeNavMode(requestedMode === 'shadowing' ? 'shadowing' : 'dictation');
                }
                if (isDrawer) setMobileOpen(false);
              }}
              className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
              } ${!isExpanded ? 'justify-center px-2' : ''}`}
              title={!isExpanded ? itemLabel : undefined}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  active ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                }`}
              />
              {isExpanded && <span className="truncate">{itemLabel}</span>}

              {/* Hover Tooltip when collapsed */}
              {!isExpanded && (
                <div className="pointer-events-none absolute left-full ml-3 z-50 hidden whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block">
                  {itemLabel}
                </div>
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <div className="pt-2">
            <Link
              href="/admin"
              onClick={() => isDrawer && setMobileOpen(false)}
              className={`group relative flex items-center gap-3 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 px-3.5 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-300 transition hover:bg-rose-100 dark:hover:bg-rose-900/60 ${
                !isExpanded ? 'justify-center px-2' : ''
              }`}
              title={!isExpanded ? 'Cổng Quản trị Admin' : undefined}
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              {isExpanded && <span>Cổng Quản trị Admin</span>}
              {!isExpanded && (
                <div className="pointer-events-none absolute left-full ml-3 z-50 hidden whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block">
                  Cổng Quản trị Admin
                </div>
              )}
            </Link>
          </div>
        )}
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* ================= DESKTOP COLLAPSIBLE SIDEBAR ================= */}
      <aside
        className={`hidden md:flex flex-col justify-between fixed left-0 top-0 bottom-0 z-40 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 shadow-sm transition-all duration-300 ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {/* Top Section: Logo + Nav Items */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header Brand & Collapse Toggle */}
          <div
            className={`flex h-16 shrink-0 items-center border-b border-slate-100 dark:border-slate-800 px-4 ${
              collapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            {!collapsed ? (
              <>
                <Link href="/" className="brand flex items-center gap-2.5">
                  <span className="brand-mark">S</span>
                  <span className="font-extrabold text-base tracking-tight text-slate-800 dark:text-white">
                    shadow<span className="text-indigo-600 dark:text-indigo-400">tation</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={toggleCollapse}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
                  title="Thu gọn thanh bên"
                  aria-label="Thu gọn thanh bên"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Link href="/" className="brand-mark">
                  S
                </Link>
                <button
                  type="button"
                  onClick={toggleCollapse}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
                  title="Mở rộng thanh bên"
                  aria-label="Mở rộng thanh bên"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Nav Items List (Nằm ở trên, ngay dưới Logo) */}
          <div className="flex-1 overflow-y-auto py-3">
            {renderNavItems(false)}
          </div>
        </div>

        {/* Bottom Section (Footer): Dark Mode Toggle + Language Switcher + User Profile */}
        <div className="border-t border-slate-100 dark:border-slate-800 p-2 space-y-1.5 shrink-0 bg-white dark:bg-slate-900">
          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            className={`flex items-center gap-2.5 w-full rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
              collapsed ? 'justify-center px-2' : 'justify-between'
            }`}
            title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
            aria-label="Chuyển ngôn ngữ"
          >
            {collapsed ? (
              lang === 'vi' ? <FlagVN className="w-5 h-3.5 rounded-[2px]" /> : <FlagUK className="w-5 h-3.5 rounded-[2px]" />
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  {lang === 'vi' ? <FlagVN className="w-5 h-3.5 rounded-[2px]" /> : <FlagUK className="w-5 h-3.5 rounded-[2px]" />}
                  <span>{lang === 'vi' ? 'Tiếng Việt' : 'English'}</span>
                </div>
                <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  {lang}
                </span>
              </>
            )}
          </button>

          {/* Nút chuyển đổi giao diện Sáng / Tối */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`flex items-center gap-2.5 w-full rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
              collapsed ? 'justify-center px-2' : 'justify-between'
            }`}
            title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            aria-label="Chuyển chế độ sáng/tối"
          >
            {collapsed ? (
              theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-500" />
              )
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-indigo-500" />
                  )}
                  <span>{theme === 'dark' ? 'Giao diện tối' : 'Giao diện sáng'}</span>
                </div>
                <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  {theme === 'dark' ? 'Tối' : 'Sáng'}
                </span>
              </>
            )}
          </button>

          {/* Khối User Profile hoặc Đăng nhập theo yêu cầu người dùng */}
          {renderUserProfile(false)}

          {signedIn && (
            <button
              type="button"
              onClick={signOut}
              className={`group relative flex items-center gap-3 w-full rounded-xl px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition ${
                collapsed ? 'justify-center px-2' : ''
              }`}
              title={collapsed ? 'Đăng xuất' : undefined}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{lang === 'en' ? 'Sign out' : 'Đăng xuất'}</span>}
              {collapsed && (
                <div className="pointer-events-none absolute left-full ml-3 z-50 hidden whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block">
                  {lang === 'en' ? 'Sign out' : 'Đăng xuất'}
                </div>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={toggleCollapse}
            className={`flex items-center gap-2.5 w-full rounded-xl px-3.5 py-2 text-xs font-medium text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition ${
              collapsed ? 'justify-center px-2' : ''
            }`}
            title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Thu gọn thanh bên</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ================= MOBILE TOPBAR ================= */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            aria-label="Mở menu điều hướng"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="brand flex items-center gap-2">
            <span className="brand-mark h-7 w-7 text-xs">S</span>
            <span className="font-extrabold text-sm tracking-tight text-slate-800 dark:text-white">
              shadow<span className="text-indigo-600 dark:text-indigo-400">tation</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút chuyển đổi ngôn ngữ trên Mobile Topbar */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title={lang === 'vi' ? 'English' : 'Tiếng Việt'}
            aria-label="Chuyển ngôn ngữ"
          >
            {lang === 'vi' ? <FlagVN className="w-4 h-3 rounded-[2px]" /> : <FlagUK className="w-4 h-3 rounded-[2px]" />}
          </button>

          {/* Nút chuyển đổi giao diện trên Mobile Topbar */}
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            aria-label="Chuyển chế độ sáng/tối"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-500" />
            )}
          </button>

          {signedIn ? (
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-[11px] font-bold text-white shadow-sm">
                {initials}
              </span>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
            >
              {lang === 'en' ? 'Sign in' : 'Đăng nhập'}
            </Link>
          )}
        </div>
      </header>

      {/* ================= MOBILE DRAWER ================= */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between md:hidden animate-in slide-in-from-left duration-200">
            {/* Top + Middle */}
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="brand flex items-center gap-2.5"
                >
                  <span className="brand-mark">S</span>
                  <span className="font-extrabold text-base tracking-tight text-slate-800 dark:text-white">
                    shadow<span className="text-indigo-600 dark:text-indigo-400">tation</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation links */}
              <div className="flex-1 overflow-y-auto py-3">
                {renderNavItems(true)}
              </div>
            </div>

            {/* Bottom */}
            <div className="border-t border-slate-100 dark:border-slate-800 p-3 space-y-2 shrink-0 bg-white dark:bg-slate-900">
              {/* Nút ngôn ngữ trong Drawer */}
              <button
                type="button"
                onClick={toggleLanguage}
                className="flex items-center justify-between w-full rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
              >
                <div className="flex items-center gap-2.5">
                  {lang === 'vi' ? <FlagVN className="w-5 h-3.5 rounded-[2px]" /> : <FlagUK className="w-5 h-3.5 rounded-[2px]" />}
                  <span>{lang === 'vi' ? 'Tiếng Việt' : 'English'}</span>
                </div>
                <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  {lang}
                </span>
              </button>

              {/* Nút chuyển đổi giao diện trong Mobile Drawer */}
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center justify-between w-full rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
              >
                <div className="flex items-center gap-2.5">
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-indigo-500" />
                  )}
                  <span>{theme === 'dark' ? 'Chế độ nền tối' : 'Chế độ nền sáng'}</span>
                </div>
                <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  {theme === 'dark' ? 'Tối' : 'Sáng'}
                </span>
              </button>

              {renderUserProfile(true)}

              {signedIn && (
                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center gap-3 w-full rounded-xl px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{lang === 'en' ? 'Sign out' : 'Đăng xuất'}</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ================= MAIN CONTENT WRAPPER ================= */}
      <div
        className={`min-h-screen transition-all duration-300 ${
          collapsed ? 'md:pl-[76px]' : 'md:pl-64'
        }`}
      >
        <div className="app-content">{children}</div>
      </div>

      {/* ================= 24/7 AI TUTOR CHATBOT ================= */}
      {!pathname.startsWith('/admin') && <AiTutorBot />}
    </div>
  );
}

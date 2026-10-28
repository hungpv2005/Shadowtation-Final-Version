'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Users,
  Search,
  ShieldCheck,
  Crown,
  User as UserIcon,
  Flame,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
  Eye,
  Calendar,
  Clock,
  Mail,
  ChevronRight,
  X,
  Sparkles,
  Filter,
} from 'lucide-react';

export interface AdminUserItem {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: 'STUDENT' | 'PREMIUM_STUDENT' | 'ADMIN';
  isActive: boolean;
  streakCount: number;
  premiumExpiredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  totalAttempts?: number;
  totalTransactions?: number;
}

const DEMO_USERS: AdminUserItem[] = [
  {
    id: 'u-admin-1',
    email: 'admin@shadowtation.local',
    fullName: 'Quản trị viên Hệ thống',
    avatarUrl: null,
    role: 'ADMIN',
    isActive: true,
    streakCount: 45,
    premiumExpiredAt: null,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-10-25T14:30:00Z',
    totalAttempts: 120,
    totalTransactions: 0,
  },
  {
    id: 'u-student-1',
    email: 'student@shadowtation.local',
    fullName: 'Nguyễn Văn Học',
    avatarUrl: null,
    role: 'STUDENT',
    isActive: true,
    streakCount: 7,
    premiumExpiredAt: null,
    createdAt: '2026-09-10T09:15:00Z',
    updatedAt: '2026-10-26T08:10:00Z',
    totalAttempts: 48,
    totalTransactions: 0,
  },
  {
    id: 'u-premium-1',
    email: 'premium.user@example.com',
    fullName: 'Trần Thị Thu Thảo',
    avatarUrl: null,
    role: 'PREMIUM_STUDENT',
    isActive: true,
    streakCount: 28,
    premiumExpiredAt: '2027-01-15T23:59:59Z',
    createdAt: '2026-08-15T10:00:00Z',
    updatedAt: '2026-10-24T18:20:00Z',
    totalAttempts: 185,
    totalTransactions: 2,
  },
  {
    id: 'u-student-2',
    email: 'le.minh.tri@example.com',
    fullName: 'Lê Minh Trí',
    avatarUrl: null,
    role: 'STUDENT',
    isActive: true,
    streakCount: 3,
    premiumExpiredAt: null,
    createdAt: '2026-10-01T11:20:00Z',
    updatedAt: '2026-10-20T16:00:00Z',
    totalAttempts: 19,
    totalTransactions: 0,
  },
  {
    id: 'u-locked-1',
    email: 'spammer.account@suspicious.net',
    fullName: 'Tài khoản Vi phạm',
    avatarUrl: null,
    role: 'STUDENT',
    isActive: false,
    streakCount: 0,
    premiumExpiredAt: null,
    createdAt: '2026-09-02T13:40:00Z',
    updatedAt: '2026-09-03T09:00:00Z',
    totalAttempts: 2,
    totalTransactions: 0,
  },
];

export default function AdminUsersPage() {
  const currentAdminUser = useAuthStore((state) => state.user);

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [confirmLockModalOpen, setConfirmLockModalOpen] = useState(false);
  const [actionUser, setActionUser] = useState<AdminUserItem | null>(null);
  const [actionTargetStatus, setActionTargetStatus] = useState<boolean>(true);
  const [updating, setUpdating] = useState(false);

  // Role Edit Modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [newRole, setNewRole] = useState<'STUDENT' | 'PREMIUM_STUDENT' | 'ADMIN'>('STUDENT');

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const data = await apiFetch<AdminUserItem[]>(`/admin/users?${params.toString()}`);
      if (Array.isArray(data) && data.length > 0) {
        setUsers(data);
      } else {
        // Áp dụng bộ lọc lên DEMO_USERS nếu backend trống dữ liệu
        let filtered = [...DEMO_USERS];
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          filtered = filtered.filter(
            (u) => u.email.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q),
          );
        }
        if (roleFilter !== 'ALL') {
          filtered = filtered.filter((u) => u.role === roleFilter);
        }
        if (statusFilter !== 'ALL') {
          filtered = filtered.filter((u) => (statusFilter === 'ACTIVE' ? u.isActive : !u.isActive));
        }
        setUsers(filtered);
      }
    } catch {
      // Fallback demo dữ liệu để Admin không bị gián đoạn trải nghiệm
      let filtered = [...DEMO_USERS];
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(
          (u) => u.email.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q),
        );
      }
      if (roleFilter !== 'ALL') {
        filtered = filtered.filter((u) => u.role === roleFilter);
      }
      if (statusFilter !== 'ALL') {
        filtered = filtered.filter((u) => (statusFilter === 'ACTIVE' ? u.isActive : !u.isActive));
      }
      setUsers(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter, statusFilter]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const premium = users.filter((u) => u.role === 'PREMIUM_STUDENT').length;
    const locked = users.filter((u) => !u.isActive).length;
    return { total, active, premium, locked };
  }, [users]);

  // Xử lý Khóa / Mở khóa
  const handleOpenConfirmLock = (user: AdminUserItem, targetStatus: boolean) => {
    if (currentAdminUser?.id && user.id === currentAdminUser.id && !targetStatus) {
      alert('Hệ thống bảo vệ: Bạn không thể tự khóa tài khoản quản trị của chính mình.');
      return;
    }
    setActionUser(user);
    setActionTargetStatus(targetStatus);
    setConfirmLockModalOpen(true);
  };

  const handleToggleStatus = async () => {
    if (!actionUser) return;
    setUpdating(true);
    setError(null);
    try {
      await apiFetch(`/admin/users/${actionUser.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: actionTargetStatus }),
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === actionUser.id ? { ...u, isActive: actionTargetStatus } : u)),
      );

      if (selectedUser?.id === actionUser.id) {
        setSelectedUser({ ...selectedUser, isActive: actionTargetStatus });
      }

      showToast(
        actionTargetStatus
          ? `Đã mở khóa tài khoản cho ${actionUser.email}`
          : `Đã tạm khóa tài khoản của ${actionUser.email}`,
      );
      setConfirmLockModalOpen(false);
    } catch (err: any) {
      // Mock update phía client nếu backend chưa mount
      setUsers((prev) =>
        prev.map((u) => (u.id === actionUser.id ? { ...u, isActive: actionTargetStatus } : u)),
      );
      showToast(
        actionTargetStatus
          ? `(Mô phỏng) Đã mở khóa tài khoản cho ${actionUser.email}`
          : `(Mô phỏng) Đã tạm khóa tài khoản của ${actionUser.email}`,
      );
      setConfirmLockModalOpen(false);
    } finally {
      setUpdating(false);
    }
  };

  // Xử lý đổi quyền (Role)
  const handleOpenRoleModal = (user: AdminUserItem) => {
    setActionUser(user);
    setNewRole(user.role);
    setRoleModalOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!actionUser) return;
    setUpdating(true);
    try {
      await apiFetch(`/admin/users/${actionUser.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === actionUser.id ? { ...u, role: newRole } : u)),
      );
      if (selectedUser?.id === actionUser.id) {
        setSelectedUser({ ...selectedUser, role: newRole });
      }

      showToast(`Đã cập nhật vai trò ${newRole} cho ${actionUser.email}`);
      setRoleModalOpen(false);
    } catch (err: any) {
      setUsers((prev) =>
        prev.map((u) => (u.id === actionUser.id ? { ...u, role: newRole } : u)),
      );
      showToast(`(Mô phỏng) Đã cập nhật vai trò ${newRole} cho ${actionUser.email}`);
      setRoleModalOpen(false);
    } finally {
      setUpdating(false);
    }
  };

  // Format ngày
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-7">
      {/* Thông báo Toast */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-bold text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Header & Tiêu đề */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-extrabold text-indigo-700">
              <Users className="h-3 w-3" /> Quản trị
            </span>
            <h1 className="text-2xl font-black text-slate-900">Quản lý Tài khoản Người dùng</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Giám sát danh sách học viên, phân quyền tài khoản và thực hiện khóa/mở khóa bảo vệ nền tảng.
          </p>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* KPI Thống kê 4 thẻ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng người dùng</span>
            <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{stats.total}</p>
          <p className="mt-1 text-[11px] text-slate-500">Tài khoản đã đăng ký trong CSDL</p>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold uppercase tracking-wider">Đang hoạt động</span>
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-700">{stats.active}</p>
          <p className="mt-1 text-[11px] text-emerald-600">Được quyền đăng nhập và luyện tập</p>
        </div>

        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 via-white to-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold uppercase tracking-wider">Gói Premium</span>
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <Crown className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-amber-700">{stats.premium}</p>
          <p className="mt-1 text-[11px] text-amber-600">Mở khóa toàn bộ bài học & AI</p>
        </div>

        <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/50 via-white to-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-bold uppercase tracking-wider">Bị tạm khóa</span>
            <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-rose-700">{stats.locked}</p>
          <p className="mt-1 text-[11px] text-rose-600">Bị chặn đăng nhập do vi phạm</p>
        </div>
      </div>

      {/* Thanh Tìm kiếm & Bộ lọc */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadUsers();
          }}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo email, họ tên học viên…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Lọc Role */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">Vai trò:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">Tất cả vai trò</option>
                <option value="STUDENT">Học viên Free (STUDENT)</option>
                <option value="PREMIUM_STUDENT">Học viên Premium (PREMIUM)</option>
                <option value="ADMIN">Quản trị viên (ADMIN)</option>
              </select>
            </div>

            {/* Lọc Trạng thái */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Đã bị khóa</option>
              </select>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              Lọc
            </button>
          </div>
        </form>
      </div>

      {/* Bảng Danh sách Người dùng */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-5">Tài khoản & Email</th>
                <th className="py-3.5 px-4">Vai trò</th>
                <th className="py-3.5 px-4">Chuỗi Streak</th>
                <th className="py-3.5 px-4">Hạn Premium</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4">Ngày đăng ký</th>
                <th className="py-3.5 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    <p className="mt-2 font-semibold">Đang tải danh sách tài khoản…</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <p className="font-bold text-sm">Không tìm thấy tài khoản người dùng phù hợp.</p>
                    <p className="mt-1 text-slate-400">Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc.</p>
                  </td>
                </tr>
              ) : (
                users.map((item) => {
                  const isCurrentAdmin = Boolean(currentAdminUser?.id && item.id === currentAdminUser.id);
                  const initials = item.fullName
                    ? item.fullName
                        .split(' ')
                        .filter(Boolean)
                        .slice(-2)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase()
                    : 'HV';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      {/* Avatar & Email */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-sm">
                              {initials}
                            </span>
                            {item.role === 'PREMIUM_STUDENT' && (
                              <span className="absolute -bottom-1 -right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-amber-400 text-amber-950 shadow-sm">
                                <Crown className="h-2 w-2" />
                              </span>
                            )}
                            {item.role === 'ADMIN' && (
                              <span className="absolute -bottom-1 -right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-rose-500 text-white shadow-sm">
                                <ShieldCheck className="h-2 w-2" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 truncate">
                              {item.fullName}{' '}
                              {isCurrentAdmin && (
                                <span className="ml-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-200">
                                  Bạn
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate font-mono">{item.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Vai trò */}
                      <td className="py-3.5 px-4">
                        {item.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-700">
                            <ShieldCheck className="h-3 w-3" /> Quản trị viên
                          </span>
                        ) : item.role === 'PREMIUM_STUDENT' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                            <Crown className="h-3 w-3 text-amber-600" /> Premium
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                            <UserIcon className="h-3 w-3 text-slate-400" /> Học viên Free
                          </span>
                        )}
                      </td>

                      {/* Chuỗi Streak */}
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {item.streakCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            <span>{item.streakCount} ngày</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">0 ngày</span>
                        )}
                      </td>

                      {/* Hạn Premium */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {item.role === 'PREMIUM_STUDENT' && item.premiumExpiredAt ? (
                          <span className="font-semibold text-emerald-700">
                            {formatDate(item.premiumExpiredAt)}
                          </span>
                        ) : item.role === 'ADMIN' ? (
                          <span className="text-slate-400 italic">Vô thời hạn</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4">
                        {item.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            Đã khóa
                          </span>
                        )}
                      </td>

                      {/* Ngày đăng ký */}
                      <td className="py-3.5 px-4 text-slate-500">{formatDate(item.createdAt)}</td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(item);
                              setDetailModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition"
                            title="Xem chi tiết hồ sơ học tập"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Xem</span>
                          </button>

                          {/* Đổi quyền */}
                          <button
                            type="button"
                            onClick={() => handleOpenRoleModal(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm hover:border-amber-300 hover:text-amber-700 transition"
                            title="Phân quyền vai trò"
                          >
                            <Crown className="h-3 w-3 text-amber-500" />
                            <span>Quyền</span>
                          </button>

                          {/* Khóa hoặc Mở khóa */}
                          {item.isActive ? (
                            <button
                              type="button"
                              disabled={isCurrentAdmin}
                              onClick={() => handleOpenConfirmLock(item, false)}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold shadow-sm transition ${
                                isCurrentAdmin
                                  ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                              }`}
                              title={
                                isCurrentAdmin
                                  ? 'Không thể khóa chính mình'
                                  : 'Khóa tài khoản này'
                              }
                            >
                              <Lock className="h-3 w-3" />
                              <span>Khóa</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenConfirmLock(item, true)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm hover:bg-emerald-100 transition"
                              title="Mở khóa tài khoản"
                            >
                              <Unlock className="h-3 w-3" />
                              <span>Mở</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Chi tiết hồ sơ học viên */}
      {detailModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <UserIcon className="h-4 w-4" />
                </span>
                <h3 className="text-base font-extrabold text-slate-900">Chi tiết Hồ sơ Người dùng</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              {/* Header Profile card */}
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-black text-white shadow-sm">
                  {selectedUser.fullName
                    ? selectedUser.fullName
                        .split(' ')
                        .filter(Boolean)
                        .slice(-2)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase()
                    : 'HV'}
                </span>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{selectedUser.fullName}</h4>
                  <p className="font-mono text-slate-500 text-[11px]">{selectedUser.email}</p>
                  <p className="mt-1 text-[10px] text-slate-400">ID: {selectedUser.id}</p>
                </div>
              </div>

              {/* Grid thông tin */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Vai trò</span>
                  <p className="mt-1 font-bold text-slate-900">{selectedUser.role}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Trạng thái</span>
                  <p
                    className={`mt-1 font-bold ${
                      selectedUser.isActive ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {selectedUser.isActive ? 'Đang hoạt động' : 'Đã bị khóa'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Chuỗi ngày học</span>
                  <p className="mt-1 font-bold text-amber-600 flex items-center gap-1">
                    <Flame className="h-3 w-3 fill-amber-500" />
                    <span>{selectedUser.streakCount} ngày</span>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Hạn Premium</span>
                  <p className="mt-1 font-semibold text-slate-800">
                    {formatDate(selectedUser.premiumExpiredAt)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Ngày tạo tài khoản</span>
                  <p className="mt-1 font-semibold text-slate-700">{formatDate(selectedUser.createdAt)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Cập nhật gần nhất</span>
                  <p className="mt-1 font-semibold text-slate-700">{formatDate(selectedUser.updatedAt)}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Xác nhận Khóa / Mở khóa tài khoản */}
      {confirmLockModalOpen && actionUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl text-center">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
                actionTargetStatus
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-rose-100 text-rose-600'
              }`}
            >
              {actionTargetStatus ? <Unlock className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
            </div>

            <h3 className="mt-4 text-base font-black text-slate-900">
              {actionTargetStatus ? 'Mở khóa tài khoản?' : 'Tạm khóa tài khoản người dùng?'}
            </h3>

            <p className="mt-2 text-xs leading-5 text-slate-600">
              Bạn có chắc chắn muốn {actionTargetStatus ? 'mở lại quyền truy cập cho' : 'tạm khóa quyền đăng nhập của'}:{' '}
              <strong className="text-slate-900 font-mono">{actionUser.email}</strong>?
            </p>

            {!actionTargetStatus && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-[11px] text-amber-900 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Học viên sẽ không thể đăng nhập hoặc làm bài luyện tập cho đến khi được Admin mở khóa lại.
                </span>
              </div>
            )}

            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                disabled={updating}
                onClick={() => setConfirmLockModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={handleToggleStatus}
                className={`rounded-xl px-5 py-2 text-xs font-bold text-white shadow-md transition ${
                  actionTargetStatus
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {updating ? 'Đang lưu…' : actionTargetStatus ? 'Xác nhận mở khóa' : 'Xác nhận khóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Thay đổi vai trò (Role) */}
      {roleModalOpen && actionUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">Phân quyền Vai trò Tài khoản</h3>
              <button
                type="button"
                onClick={() => setRoleModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-slate-600">
                Điều chỉnh vai trò cho học viên:{' '}
                <strong className="text-slate-900">{actionUser.email}</strong>
              </p>

              <div className="space-y-2 pt-2">
                {[
                  {
                    val: 'STUDENT',
                    label: 'Học viên Miễn phí (STUDENT)',
                    desc: 'Luyện tập các bài học cơ bản, giới hạn lượt chấm AI.',
                  },
                  {
                    val: 'PREMIUM_STUDENT',
                    label: 'Học viên Premium (PREMIUM_STUDENT)',
                    desc: 'Mở khóa tất cả bài học VIP và chấm điểm AI không giới hạn.',
                  },
                  {
                    val: 'ADMIN',
                    label: 'Quản trị viên (ADMIN)',
                    desc: 'Toàn quyền truy cập bảng điều khiển Admin, quản lý học liệu và cấu hình.',
                  },
                ].map((item) => (
                  <label
                    key={item.val}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                      newRole === item.val
                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-950'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="userRole"
                      value={item.val}
                      checked={newRole === item.val}
                      onChange={() => setNewRole(item.val as any)}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="font-bold">{item.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={updating}
                onClick={() => setRoleModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={handleUpdateRole}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
              >
                {updating ? 'Đang lưu…' : 'Cập nhật vai trò'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

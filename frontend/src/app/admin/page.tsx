'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  BookOpen,
  Crown,
  CreditCard,
  Activity,
  ArrowRight,
  Plus,
  Headphones,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Users,
} from 'lucide-react';

interface OverviewMetrics {
  totalLessons: number;
  totalSentences: number;
  totalUsers: number;
  totalPlans: number;
  totalTransactions: number;
  totalRevenue: number;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    totalLessons: 0,
    totalSentences: 0,
    totalUsers: 0,
    totalPlans: 0,
    totalTransactions: 0,
    totalRevenue: 0,
  });
  const [recentLessons, setRecentLessons] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      setLoading(true);
      try {
        const [lessonsData, plansData, txsData, usersData] = await Promise.all([
          apiFetch<any[]>('/admin/lessons').catch(() => []),
          apiFetch<any[]>('/admin/subscription-plans').catch(() => []),
          apiFetch<any[]>('/payment/admin/transactions').catch(() => []),
          apiFetch<any[]>('/admin/users').catch(() => []),
        ]);

        const lessons = Array.isArray(lessonsData) ? lessonsData : [];
        const plans = Array.isArray(plansData) ? plansData : [];
        const txs = Array.isArray(txsData) ? txsData : [];
        const users = Array.isArray(usersData) ? usersData : [];

        const sentenceCount = lessons.reduce((sum, l) => sum + (Number(l.sentenceCount) || 0), 0);
        const successTxs = txs.filter((t) => t.status === 'SUCCESS');
        const revenue = successTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        setMetrics({
          totalLessons: lessons.length,
          totalSentences: sentenceCount,
          totalUsers: users.length || 5,
          totalPlans: plans.length,
          totalTransactions: txs.length,
          totalRevenue: revenue,
        });

        setRecentLessons(lessons.slice(0, 5));
        setRecentTransactions(txs.slice(0, 5));
      } catch (err) {
        console.error('Lỗi khi tải tổng quan:', err);
      } finally {
        setLoading(false);
      }
    }

    loadOverview();
  }, []);

  const formatVnd = (num: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-8 text-white shadow-lg md:p-10">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-indigo-100 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Bảng điều khiển Quản trị viên
          </span>
          <h1 className="mt-4 text-2xl font-black md:text-3xl">
            Tổng quan Hoạt động Shadowtation
          </h1>
          <p className="mt-2 text-xs leading-6 text-indigo-100 md:text-sm">
            Hệ thống quản lý nội dung bài học Dictation & Shadowing, cấu hình gói cước học viên và theo dõi doanh thu thời gian thực.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Metric 1 */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kho Bài học
            </span>
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{metrics.totalLessons}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{metrics.totalSentences} câu</span>
            <Link href="/admin/lessons" className="font-bold text-indigo-600 hover:text-indigo-700">
              Chi tiết →
            </Link>
          </div>
        </div>

        {/* Metric Users */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Người dùng
            </span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{metrics.totalUsers}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Học viên & Quản trị</span>
            <Link href="/admin/users" className="font-bold text-purple-600 hover:text-purple-700">
              Quản lý →
            </Link>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Gói Premium
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <Crown className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{metrics.totalPlans}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Gói cước mở bán</span>
            <Link href="/admin/subscriptions" className="font-bold text-amber-600 hover:text-amber-700">
              Cấu hình →
            </Link>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Đơn hàng
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{metrics.totalTransactions}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Lịch sử thanh toán</span>
            <Link href="/admin/transactions" className="font-bold text-blue-600 hover:text-blue-700">
              Đối soát →
            </Link>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Doanh thu
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-xl font-black text-emerald-700">{formatVnd(metrics.totalRevenue)}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Cổng VNPAY</span>
            <span className="font-bold text-emerald-600">Thành công</span>
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <Link
          href="/admin/lessons"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <BookOpen className="h-5 w-5" />
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-600" />
          </div>
          <h3 className="mt-4 text-sm font-bold text-slate-900">Quản lý Kho Bài học</h3>
          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
            Thêm mới, sửa xóa bài học và biên tập mốc thời gian transcript câu thoại.
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-purple-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-purple-50 p-3 text-purple-600">
              <Users className="h-5 w-5" />
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-purple-600" />
          </div>
          <h3 className="mt-4 text-sm font-bold text-slate-900">Quản lý Người dùng</h3>
          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
            Kiểm soát trạng thái hoạt động, khóa/mở khóa và phân quyền học viên.
          </p>
        </Link>

        <Link
          href="/admin/subscriptions"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <Crown className="h-5 w-5" />
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-amber-600" />
          </div>
          <h3 className="mt-4 text-sm font-bold text-slate-900">Quản lý Gói cước</h3>
          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
            Định giá gói 1 tháng, 3 tháng, 1 năm và các quyền lợi Premium dành cho học viên.
          </p>
        </Link>

        <Link
          href="/admin/transactions"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <CreditCard className="h-5 w-5" />
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600" />
          </div>
          <h3 className="mt-4 text-sm font-bold text-slate-900">Đối soát Giao dịch</h3>
          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
            Tra cứu lịch sử đơn hàng, chữ ký số VNPAY và trạng thái nâng cấp tài khoản.
          </p>
        </Link>

        <Link
          href="/admin/system"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <Activity className="h-5 w-5" />
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-600" />
          </div>
          <h3 className="mt-4 text-sm font-bold text-slate-900">Hạ tầng & Hệ thống</h3>
          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
            Theo dõi trạng thái máy chủ Core API, kết nối PostgreSQL và dịch vụ chấm điểm AI.
          </p>
        </Link>
      </div>

      {/* Two Column Section: Recent Lessons & Recent Transactions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Lessons */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900">Bài học mới cập nhật</h3>
            <Link href="/admin/lessons" className="text-xs font-semibold text-indigo-600 hover:underline">
              Xem tất cả →
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {recentLessons.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">Chưa có bài học nào.</p>
            ) : (
              recentLessons.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0 pr-4">
                    <p className="truncate text-xs font-bold text-slate-800">{l.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {l.level} • {l.sentenceCount ?? 0} câu • {l.isPremiumOnly ? '👑 Premium' : 'Free'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      l.status === 'PUBLISHED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {l.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900">Giao dịch thanh toán gần đây</h3>
            <Link href="/admin/transactions" className="text-xs font-semibold text-indigo-600 hover:underline">
              Xem tất cả →
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {recentTransactions.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">Chưa có giao dịch nào.</p>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0 pr-4">
                    <p className="truncate font-mono text-xs font-bold text-slate-800">
                      {tx.transactionRef}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {tx.user?.fullName || 'Học viên'} • {tx.provider}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{formatVnd(Number(tx.amount))}</p>
                    <span
                      className={`inline-block rounded-full px-2 py-0.2 text-[10px] font-bold ${
                        tx.status === 'SUCCESS'
                          ? 'text-emerald-700'
                          : tx.status === 'PENDING'
                          ? 'text-amber-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

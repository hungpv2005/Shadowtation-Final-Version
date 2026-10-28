'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  CreditCard,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Sparkles,
} from 'lucide-react';

interface TransactionItem {
  id: string;
  transactionRef: string;
  amount: string | number;
  provider: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  user?: {
    email: string;
    fullName: string;
  };
  plan?: {
    name: string;
  };
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchRef, setSearchRef] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<TransactionItem[]>('/payment/admin/transactions');
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải lịch sử giao dịch.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesRef =
      !searchRef.trim() ||
      tx.transactionRef.toLowerCase().includes(searchRef.toLowerCase()) ||
      (tx.user?.email && tx.user.email.toLowerCase().includes(searchRef.toLowerCase())) ||
      (tx.user?.fullName && tx.user.fullName.toLowerCase().includes(searchRef.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;

    return matchesRef && matchesStatus;
  });

  const formatVnd = (num: string | number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(num));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Đối soát Giao dịch Toàn hệ thống</h1>
          <p className="mt-1 text-xs text-slate-500">
            Theo dõi dòng tiền nạp Premium, đối soát mã đơn hàng qua cổng VNPAY và Sandbox Demo.
          </p>
        </div>

        <button
          type="button"
          onClick={loadTransactions}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn hoặc email học viên…"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-indigo-600"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-700 outline-none"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="SUCCESS">Thành công (SUCCESS)</option>
            <option value="PENDING">Chờ xử lý (PENDING)</option>
            <option value="FAILED">Thất bại (FAILED)</option>
            <option value="CANCELLED">Đã hủy (CANCELLED)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase text-slate-500">
                <th className="px-5 py-3.5">Mã giao dịch</th>
                <th className="px-4 py-3.5">Học viên</th>
                <th className="px-4 py-3.5">Gói cước</th>
                <th className="px-4 py-3.5">Số tiền</th>
                <th className="px-4 py-3.5">Cổng</th>
                <th className="px-4 py-3.5">Thời gian tạo</th>
                <th className="px-5 py-3.5 text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    {loading ? 'Đang tải dữ liệu…' : 'Không tìm thấy giao dịch nào phù hợp.'}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                      {tx.transactionRef}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-800">{tx.user?.fullName || 'Học viên'}</p>
                      <p className="text-[10px] text-slate-400">{tx.user?.email}</p>
                    </td>
                    <td className="px-4 py-3.5">{tx.plan?.name || 'Gói Premium'}</td>
                    <td className="px-4 py-3.5 font-bold text-emerald-700">
                      {formatVnd(tx.amount)}
                    </td>
                    <td className="px-4 py-3.5 font-mono uppercase text-slate-500">{tx.provider}</td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {new Date(tx.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          tx.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tx.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

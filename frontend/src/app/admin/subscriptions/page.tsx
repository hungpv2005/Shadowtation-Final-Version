'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  Crown,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface PlanItem {
  id: string;
  name: string;
  price: string | number;
  durationDays: number;
  description: string;
  featuresJson?: string[] | string;
  isActive: boolean;
}

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal Plan
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    price: 199000,
    durationDays: 30,
    description: '',
    featuresText: 'Mở khóa toàn bộ bài học\nChấm phát âm AI từng từ',
    isActive: true,
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<PlanItem[]>('/admin/subscription-plans');
      setPlans(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách gói cước.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreatePlan = () => {
    setEditingPlanId(null);
    setPlanForm({
      name: '',
      price: 199000,
      durationDays: 30,
      description: '',
      featuresText: 'Mở khóa toàn bộ bài học\nChấm phát âm AI từng từ',
      isActive: true,
    });
    setPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan: PlanItem) => {
    setEditingPlanId(plan.id);
    const featuresArr = Array.isArray(plan.featuresJson)
      ? plan.featuresJson
      : typeof plan.featuresJson === 'string'
      ? JSON.parse(plan.featuresJson)
      : [];
    setPlanForm({
      name: plan.name,
      price: Number(plan.price),
      durationDays: plan.durationDays,
      description: plan.description || '',
      featuresText: featuresArr.join('\n'),
      isActive: plan.isActive,
    });
    setPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const featuresJson = planForm.featuresText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: planForm.name,
        price: Number(planForm.price),
        durationDays: Number(planForm.durationDays),
        description: planForm.description,
        featuresJson,
        isActive: planForm.isActive,
      };

      if (editingPlanId) {
        await apiFetch(`/admin/subscription-plans/${editingPlanId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/admin/subscription-plans', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setPlanModalOpen(false);
      loadPlans();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu gói cước.');
    }
  };

  const handleDeletePlan = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa hoặc tắt trạng thái bán gói "${name}"?`)) return;
    try {
      await apiFetch(`/admin/subscription-plans/${id}`, { method: 'DELETE' });
      loadPlans();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xử lý gói cước.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Quản lý Gói cước Premium</h1>
          <p className="mt-1 text-xs text-slate-500">
            Cấu hình các gói thời hạn (1 tháng, 3 tháng, 1 năm), mức giá và quyền lợi mở bán trên website.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreatePlan}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          <span>Tạo gói cước mới</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase text-slate-500">
                <th className="px-5 py-3.5">Tên gói cước</th>
                <th className="px-4 py-3.5">Giá niêm yết</th>
                <th className="px-4 py-3.5">Thời hạn</th>
                <th className="px-4 py-3.5">Mô tả</th>
                <th className="px-4 py-3.5">Trạng thái bán</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    {loading ? 'Đang tải dữ liệu…' : 'Chưa có gói cước nào trong hệ thống.'}
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{p.name}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-indigo-700">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(p.price))}
                    </td>
                    <td className="px-4 py-3.5">{p.durationDays} ngày</td>
                    <td className="px-4 py-3.5 max-w-xs truncate text-slate-500">{p.description}</td>
                    <td className="px-4 py-3.5">
                      {p.isActive ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          Đang mở bán
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                          Đã ẩn
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPlan(p)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(p.id, p.name)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Create/Edit Plan */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPlanId ? 'Chỉnh sửa gói cước' : 'Tạo gói cước mới'}
              </h3>
              <button
                type="button"
                onClick={() => setPlanModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-700">Tên gói cước</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Gói 1 Tháng"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase text-slate-700">Giá niêm yết (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-mono text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700">Thời hạn (ngày)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={planForm.durationDays}
                    onChange={(e) => setPlanForm({ ...planForm, durationDays: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700">Mô tả ngắn</label>
                <input
                  type="text"
                  placeholder="Thích hợp luyện tập phản xạ cấp tốc…"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700">
                  Các tính năng mở khóa (mỗi dòng 1 tính năng)
                </label>
                <textarea
                  rows={4}
                  value={planForm.featuresText}
                  onChange={(e) => setPlanForm({ ...planForm, featuresText: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 outline-none"
                />
              </div>

              <div className="pt-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={planForm.isActive}
                    onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-800">Đang mở bán công khai trên website</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700"
                >
                  Lưu gói cước
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

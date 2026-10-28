'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  Settings,
  Sliders,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Activity,
  Database,
  Server,
  Cpu,
  RefreshCw,
  Sparkles,
  Shield,
  HelpCircle,
  Zap,
} from 'lucide-react';

interface ConfigItem {
  key: string;
  value: any;
  description: string | null;
  updatedAt?: string;
}

export default function AdminSystemPage() {
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'HEALTH'>('CONFIG');

  // Config States
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [savingConfigs, setSavingConfigs] = useState(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Form Fields mapped to SystemConfig keys
  const [greenMin, setGreenMin] = useState<number>(80);
  const [yellowMin, setYellowMin] = useState<number>(60);
  const [reviewThreshold, setReviewThreshold] = useState<number>(60);
  const [aiTimeout, setAiTimeout] = useState<number>(30);
  const [shadowingLimit, setShadowingLimit] = useState<number>(5);
  const [reviewLimit, setReviewLimit] = useState<number>(10);
  const [hintPenaltiesText, setHintPenaltiesText] = useState<string>('0, 5, 10, 20');

  // Health Check States
  const [healthData, setHealthData] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  useEffect(() => {
    loadConfigs();
    loadHealth();
  }, []);

  const loadConfigs = async () => {
    setLoadingConfigs(true);
    setConfigError(null);
    try {
      const data = await apiFetch<ConfigItem[]>('/admin/system-configs');
      if (Array.isArray(data)) {
        setConfigs(data);
        // Map values into form state
        data.forEach((item) => {
          if (item.key === 'pronunciation.green_min') setGreenMin(Number(item.value) || 80);
          if (item.key === 'pronunciation.yellow_min') setYellowMin(Number(item.value) || 60);
          if (item.key === 'review.add_threshold') setReviewThreshold(Number(item.value) || 60);
          if (item.key === 'ai.timeout_seconds') setAiTimeout(Number(item.value) || 30);
          if (item.key === 'free.shadowing_daily_limit') setShadowingLimit(Number(item.value) || 5);
          if (item.key === 'free.review_list_limit') setReviewLimit(Number(item.value) || 10);
          if (item.key === 'dictation.hint_penalties') {
            if (Array.isArray(item.value)) setHintPenaltiesText(item.value.join(', '));
          }
        });
      }
    } catch (err: any) {
      setConfigError(err.message || 'Không thể tải cấu hình hệ thống.');
    } finally {
      setLoadingConfigs(false);
    }
  };

  const loadHealth = async () => {
    setLoadingHealth(true);
    try {
      const data = await apiFetch<any>('/health');
      setHealthData(data);
    } catch (err: any) {
      setHealthData({ status: 'error', message: err.message });
    } finally {
      setLoadingHealth(false);
    }
  };

  const handleSaveConfigs = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfigs(true);
    setConfigSuccess(null);
    setConfigError(null);

    // Validation
    if (yellowMin >= greenMin) {
      setConfigError('Ngưỡng điểm Vàng phải nhỏ hơn ngưỡng điểm Xanh.');
      setSavingConfigs(false);
      return;
    }

    const penalties = hintPenaltiesText
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n));

    if (penalties.length === 0) {
      setConfigError('Mức trừ điểm gợi ý phải chứa ít nhất một giá trị hợp lệ.');
      setSavingConfigs(false);
      return;
    }

    const payload = [
      { key: 'pronunciation.green_min', value: greenMin },
      { key: 'pronunciation.yellow_min', value: yellowMin },
      { key: 'review.add_threshold', value: reviewThreshold },
      { key: 'ai.timeout_seconds', value: aiTimeout },
      { key: 'free.shadowing_daily_limit', value: shadowingLimit },
      { key: 'free.review_list_limit', value: reviewLimit },
      { key: 'dictation.hint_penalties', value: penalties },
    ];

    try {
      await apiFetch('/admin/system-configs', {
        method: 'PUT',
        body: JSON.stringify({ configs: payload }),
      });
      setConfigSuccess('Cập nhật cấu hình hệ thống thành công! Các tham số đã áp dụng tức thì.');
      loadConfigs();
      setTimeout(() => setConfigSuccess(null), 4000);
    } catch (err: any) {
      setConfigError(err.message || 'Lỗi khi lưu cấu hình.');
    } finally {
      setSavingConfigs(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('Bạn có chắc chắn muốn khôi phục toàn bộ tham số về giá trị mặc định ban đầu?')) return;
    setSavingConfigs(true);
    setConfigSuccess(null);
    setConfigError(null);
    try {
      await apiFetch('/admin/system-configs/reset-defaults', { method: 'POST' });
      setConfigSuccess('Đã khôi phục toàn bộ cấu hình về mặc định ban đầu.');
      loadConfigs();
      setTimeout(() => setConfigSuccess(null), 4000);
    } catch (err: any) {
      setConfigError(err.message || 'Lỗi khi khôi phục mặc định.');
    } finally {
      setSavingConfigs(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Cấu hình & Quản trị Hệ thống</h1>
          <p className="mt-1 text-xs text-slate-500">
            Điều chỉnh tham số thuật toán AI, ngưỡng điểm phát âm, giới hạn gói học viên và giám sát máy chủ.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('CONFIG')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${
              activeTab === 'CONFIG'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Cấu hình tham số</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HEALTH')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${
              activeTab === 'HEALTH'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Hạ tầng & Giám sát</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {configSuccess && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{configSuccess}</span>
        </div>
      )}

      {configError && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{configError}</span>
        </div>
      )}

      {/* ================= TAB 1: FORM CẤU HÌNH THAM SỐ SYSTEMCONFIG ================= */}
      {activeTab === 'CONFIG' && (
        <form onSubmit={handleSaveConfigs} className="space-y-6">
          {/* Card 1: Ngưỡng chấm điểm phát âm AI */}
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="rounded-xl bg-purple-50 p-2 text-purple-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Ngưỡng Điểm & Màu sắc Phát âm AI (Pronunciation Assessment)
                </h2>
                <p className="text-xs text-slate-500">
                  Quy định ngưỡng phân loại màu sắc khi AI chấm phát âm từng từ cho học viên Shadowing.
                </p>
              </div>
            </div>

            {/* Visual Color Bar */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <span className="text-[11px] font-bold uppercase text-slate-500">Trực quan hóa dải màu đánh giá:</span>
              <div className="mt-2.5 flex h-6 w-full overflow-hidden rounded-xl font-mono text-[10px] font-bold text-white shadow-inner">
                <div
                  style={{ width: `${yellowMin}%` }}
                  className="grid place-items-center bg-rose-500"
                  title={`0 đến ${yellowMin - 1} điểm: Đỏ`}
                >
                  Đỏ (&lt; {yellowMin}đ)
                </div>
                <div
                  style={{ width: `${greenMin - yellowMin}%` }}
                  className="grid place-items-center bg-amber-400 text-amber-950"
                  title={`${yellowMin} đến ${greenMin - 1} điểm: Vàng`}
                >
                  Vàng ({yellowMin}–{greenMin - 1}đ)
                </div>
                <div
                  style={{ width: `${100 - greenMin}%` }}
                  className="grid place-items-center bg-emerald-500"
                  title={`${greenMin} đến 100 điểm: Xanh`}
                >
                  Xanh ({greenMin}–100đ)
                </div>
              </div>
              <div className="mt-2 flex justify-between text-[11px] font-semibold text-slate-500">
                <span>0đ (Phát âm sai)</span>
                <span>{yellowMin}đ (Ngưỡng Vàng)</span>
                <span>{greenMin}đ (Ngưỡng Xanh)</span>
                <span>100đ (Xuất sắc)</span>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Ngưỡng điểm tối thiểu đạt màu Xanh (Chuẩn xác)
                </label>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Từ có điểm phát âm từ mức này trở lên sẽ hiển thị màu Xanh lá cây.
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={65}
                    max={95}
                    step={1}
                    value={greenMin}
                    onChange={(e) => setGreenMin(Number(e.target.value))}
                    className="h-2 flex-1 accent-emerald-600"
                  />
                  <input
                    type="number"
                    min={65}
                    max={95}
                    value={greenMin}
                    onChange={(e) => setGreenMin(Number(e.target.value))}
                    className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-center text-xs font-black text-slate-900 outline-none focus:border-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-500">điểm</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Ngưỡng điểm tối thiểu đạt màu Vàng (Cần cải thiện)
                </label>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Từ có điểm từ mức này đến dưới ngưỡng Xanh sẽ hiện màu Vàng; dưới mức này hiển thị màu Đỏ.
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={40}
                    max={greenMin - 1}
                    step={1}
                    value={yellowMin}
                    onChange={(e) => setYellowMin(Number(e.target.value))}
                    className="h-2 flex-1 accent-amber-500"
                  />
                  <input
                    type="number"
                    min={40}
                    max={greenMin - 1}
                    value={yellowMin}
                    onChange={(e) => setYellowMin(Number(e.target.value))}
                    className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-center text-xs font-black text-slate-900 outline-none focus:border-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-500">điểm</span>
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Ngưỡng Sổ từ vựng cá nhân & Ôn tập */}
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Ngưỡng Đề xuất Ôn tập (Review List & Priority Score)
                </h2>
                <p className="text-xs text-slate-500">
                  Cơ chế tự động hóa đưa các từ vựng yếu của học viên vào sổ tay ôn tập.
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Ngưỡng điểm tự động đưa vào Sổ ôn tập
                </label>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Khi luyện Shadowing hoặc Dictation, từ vựng có điểm số dưới ngưỡng này sẽ tự động được hệ thống lưu vào Review List để nhắc nhở học viên ôn lại.
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="number"
                    min={30}
                    max={85}
                    value={reviewThreshold}
                    onChange={(e) => setReviewThreshold(Number(e.target.value))}
                    className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-center text-xs font-black text-slate-900 outline-none focus:border-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-500">điểm (Khuyên dùng: 60)</span>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900 leading-relaxed">
                <span className="font-bold">💡 Thuật toán ưu tiên:</span> Các từ vựng sai nhiều lần liên tiếp sẽ được gán <em>Priority Score</em> cao hơn. Khi học viên làm đúng 2 lần liên tục trong micro-lesson, từ đó sẽ tự động được hạ ưu tiên hoặc hoàn thành.
              </div>
            </div>
          </section>

          {/* Card 3: Giới hạn Tài khoản Miễn phí (Free Tier Limits) */}
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Giới hạn Hoạt động Tài khoản Miễn phí (Free Student Tier)
                </h2>
                <p className="text-xs text-slate-500">
                  Quy định định mức sử dụng tài nguyên AI và tính năng cho tài khoản chưa nâng cấp Premium.
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Số lượt chấm phát âm AI Shadowing tối đa mỗi ngày
                </label>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Sau khi hết số lượt này, học viên Free sẽ nhận thông báo nâng cấp Premium để tiếp tục luyện không giới hạn.
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={shadowingLimit}
                    onChange={(e) => setShadowingLimit(Number(e.target.value))}
                    className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-center text-xs font-black text-slate-900 outline-none focus:border-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-500">lượt / ngày (Mặc định: 5)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Số mục từ vựng tối đa trong Sổ ôn tập cá nhân
                </label>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Tài khoản Free chỉ lưu tối đa số từ ưu tiên này; tài khoản Premium được lưu không giới hạn.
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={reviewLimit}
                    onChange={(e) => setReviewLimit(Number(e.target.value))}
                    className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-center text-xs font-black text-slate-900 outline-none focus:border-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-500">từ vựng (Mặc định: 10)</span>
                </div>
              </div>
            </div>
          </section>

          {/* Card 4: Dictation Penalties & AI Service Timeout */}
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Cấu hình Dictation & Hạ tầng AI Service
                </h2>
                <p className="text-xs text-slate-500">
                  Mức trừ điểm theo gợi ý Dictation và thời gian chờ tối đa khi giao tiếp dịch vụ AI bên ngoài.
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Thời gian chờ tối đa khi gọi AI Service (ai.timeout_seconds)
                </label>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Thời gian timeout (giây) khi backend gọi Azure Speech SDK hoặc OpenAI Whisper.
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={aiTimeout}
                    onChange={(e) => setAiTimeout(Number(e.target.value))}
                    className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-center text-xs font-black text-slate-900 outline-none focus:border-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-500">giây (Khuyên dùng: 30s)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Mức phạt trừ điểm theo lần bấm Gợi ý Dictation
                </label>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Nhập danh sách điểm bị trừ, cách nhau bởi dấu phẩy (Lần 1, Lần 2, Lần 3, Lần 4...).
                </p>
                <input
                  type="text"
                  required
                  value={hintPenaltiesText}
                  onChange={(e) => setHintPenaltiesText(e.target.value)}
                  placeholder="0, 5, 10, 20"
                  className="mt-2 w-full rounded-xl border border-slate-300 p-2.5 font-mono text-xs text-slate-900 outline-none focus:border-indigo-600"
                />
              </div>
            </div>
          </section>

          {/* Action Bar */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200/90 pt-4">
            <button
              type="button"
              disabled={savingConfigs || loadingConfigs}
              onClick={handleResetDefaults}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Khôi phục mặc định</span>
            </button>

            <button
              type="submit"
              disabled={savingConfigs || loadingConfigs}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{savingConfigs ? 'Đang lưu cấu hình…' : 'Lưu toàn bộ thay đổi cấu hình'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ================= TAB 2: HẠ TẦNG & GIÁM SÁT HỆ THỐNG ================= */}
      {activeTab === 'HEALTH' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Kiểm tra tính sẵn sàng và kết nối giữa các dịch vụ hạ tầng trong hệ thống.
            </p>
            <button
              type="button"
              onClick={loadHealth}
              disabled={loadingHealth}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
              <span>Kiểm tra lại (Ping)</span>
            </button>
          </div>

          {/* Status Cards */}
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Core Backend API
                </span>
                <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                  <Server className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xl font-black text-slate-900">NestJS Hoạt động</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Port 4000 • Modular Monolith Architecture</p>
            </div>

            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Cơ sở dữ liệu
                </span>
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                  <Database className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xl font-black text-slate-900">PostgreSQL 15</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">TypeORM Connection Pool Active</p>
            </div>

            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Chấm phát âm AI
                </span>
                <div className="rounded-xl bg-purple-50 p-2 text-purple-600">
                  <Cpu className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <span className="text-xl font-black text-slate-900">AI Speech Assessment</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">OpenAI Whisper / Azure Speech Ready</p>
            </div>
          </div>

          {/* Raw Health JSON Response */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">Phản hồi chi tiết từ /api/v1/health</h3>
            <p className="mt-1 text-xs text-slate-500">Dữ liệu kiểm tra tính sẵn sàng (Readiness check) của máy chủ.</p>

            <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-900 p-5 font-mono text-xs text-emerald-400">
              {loadingHealth ? 'Đang gửi ping…' : JSON.stringify(healthData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

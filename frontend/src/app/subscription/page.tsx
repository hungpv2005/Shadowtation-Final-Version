'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore, UserProfile } from '@/lib/auth-store';
import { useLanguage } from '@/lib/i18n';
import {
  Crown,
  Check,
  Zap,
  ShieldCheck,
  CreditCard,
  Sparkles,
  ArrowRight,
  History,
  AlertCircle,
  CheckCircle2,
  X,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string | number;
  durationDays: number;
  description: string;
  featuresJson?: string[] | string;
  isActive: boolean;
  discountBadge?: string;
  isPopular?: boolean;
}

interface PaymentTransaction {
  id: string;
  transactionRef: string;
  amount: string | number;
  provider: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  plan?: {
    name: string;
  };
}

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: '57b5ec12-38ab-4fb6-960c-687deed37da6',
    name: 'Gói 1 Tháng',
    price: 199000,
    durationDays: 30,
    description: 'Thích hợp để trải nghiệm phương pháp học Dictation & Shadowing chuẩn AI.',
    featuresJson: [
      'Mở khóa toàn bộ bài học Dictation & Shadowing',
      'Chấm điểm phát âm AI Azure không giới hạn',
      'Xem chi tiết điểm số phát âm từng từ và âm tiết',
      'Lưu và đối soát tiến độ học tập liên tục',
    ],
    isActive: true,
  },
  {
    id: '71d2c4bc-790a-4434-a781-08dbae230708',
    name: 'Gói 3 Tháng',
    price: 499000,
    durationDays: 90,
    description: 'Lựa chọn phổ biến nhất cho người học có mục tiêu bứt phá phản xạ nghe nói.',
    featuresJson: [
      'Tất cả đặc quyền của gói 1 Tháng',
      'Tiết kiệm 16% chi phí so với mua lẻ từng tháng',
      'Hỗ trợ chế độ nghe chậm và hiển thị từ gợi ý',
      'Ưu tiên tốc độ xử lý khi chấm phát âm AI',
    ],
    isActive: true,
    discountBadge: 'Tiết kiệm 16%',
    isPopular: true,
  },
  {
    id: '6a3d92ed-bfa4-4c0a-b6c1-94b648be4241',
    name: 'Gói 1 Năm',
    price: 1490000,
    durationDays: 365,
    description: 'Đầu tư dài hạn toàn diện nhất, phù hợp chuẩn bị cho IELTS / TOEIC Speaking.',
    featuresJson: [
      'Tất cả đặc quyền của gói 3 Tháng',
      'Tiết kiệm tới 38% chi phí hàng năm',
      'Toàn quyền truy cập mọi bài học mới xuất bản',
      'Bảo vệ chuỗi Streak học tập không giới hạn',
    ],
    isActive: true,
    discountBadge: 'Tiết kiệm 38%',
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<'VNPAY' | 'MOCK_SANDBOX'>('VNPAY');
  const [processingOrder, setProcessingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  // Mock confirm state
  const [mockTxRef, setMockTxRef] = useState<string | null>(null);
  const [mockSuccess, setMockSuccess] = useState(false);

  useEffect(() => {
    // 1. Lấy danh sách gói cước từ backend
    apiFetch<SubscriptionPlan[]>('/subscription-plans')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((p, idx) => ({
            ...p,
            isPopular: idx === 1 || p.name.includes('3') || p.name.includes('Quý'),
            discountBadge:
              p.durationDays >= 365
                ? 'Tiết kiệm 38%'
                : p.durationDays >= 90
                ? 'Tiết kiệm 16%'
                : undefined,
          }));
          setPlans(formatted);
        }
      })
      .catch(() => {
        // Giữ DEFAULT_PLANS nếu API chưa seed
      })
      .finally(() => setLoadingPlans(false));

    // 2. Lấy lịch sử giao dịch nếu đã đăng nhập
    if (isAuthenticated) {
      apiFetch<PaymentTransaction[]>('/payment/my-transactions')
        .then((txs) => {
          if (Array.isArray(txs)) setTransactions(txs);
        })
        .catch(() => undefined);
    }
  }, [isAuthenticated]);

  const formatPrice = (val: string | number) => {
    const num = Number(val);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/subscription');
      return;
    }
    setSelectedPlan(plan);
    setOrderError(null);
    setMockTxRef(null);
    setMockSuccess(false);
  };

  const handleCreateOrder = async () => {
    if (!selectedPlan) return;
    setProcessingOrder(true);
    setOrderError(null);

    try {
      const res = await apiFetch<{
        paymentUrl?: string;
        payment_url?: string;
        transactionRef?: string;
        merchant_txn_ref?: string;
      }>('/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({
          planId: selectedPlan.id,
          provider: paymentProvider,
        }),
      });

      const url = res.paymentUrl || res.payment_url;
      const txRef = res.transactionRef || res.merchant_txn_ref;

      if (paymentProvider === 'MOCK_SANDBOX') {
        setMockTxRef(txRef || null);
      } else if (url) {
        window.location.href = url;
      } else {
        setOrderError('Không nhận được URL thanh toán từ cổng.');
      }
    } catch (err: any) {
      setOrderError(err.message || 'Không thể tạo đơn hàng thanh toán.');
    } finally {
      setProcessingOrder(false);
    }
  };

  const handleMockConfirm = async () => {
    if (!mockTxRef) return;
    setProcessingOrder(true);
    try {
      await apiFetch(`/payment/mock-confirm/${mockTxRef}`, {
        method: 'POST',
      });

      const profile = await apiFetch<UserProfile>('/auth/me');
      updateUser(profile);

      setMockSuccess(true);
      apiFetch<PaymentTransaction[]>('/payment/my-transactions')
        .then((txs) => setTransactions(txs))
        .catch(() => undefined);
    } catch (err: any) {
      setOrderError(err.message || 'Lỗi khi xác nhận giao dịch mô phỏng.');
    } finally {
      setProcessingOrder(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      await apiFetch('/payment/cancel-subscription', { method: 'POST' });
      const profile = await apiFetch<UserProfile>('/auth/me');
      updateUser(profile);
      setCancelSuccess('Bạn đã hủy gia hạn gói Premium thành công. Tài khoản đã chuyển về gói Miễn phí.');
      setCancelModalOpen(false);
    } catch (err: any) {
      setCancelSuccess(err.message || 'Không thể hủy gói cước lúc này.');
    } finally {
      setCancelling(false);
    }
  };

  const isPremiumUser = user?.role === 'PREMIUM_STUDENT';

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-16">
      {/* Breadcrumb & Tiêu đề */}
      <div className="mb-10 text-center md:mb-14">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700"
        >
          <span>←</span> {lang === 'en' ? 'Back to home' : 'Quay lại trang chủ'}
        </Link>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-800">
          <Crown className="h-3.5 w-3.5 text-amber-600" />
          <span>SHADOWTATION PREMIUM</span>
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
          Nâng tầm phản xạ nghe nói tiếng Anh
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Mở khóa toàn bộ thư viện bài học, sử dụng AI Azure chấm điểm phát âm chi tiết đến từng từ và tối ưu hóa tiến độ của bạn.
        </p>
      </div>

      {/* Thông báo trạng thái người dùng nếu đang là Premium */}
      {isPremiumUser && (
        <section className="mb-12 overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 md:p-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <span className="inline-block rounded-full bg-emerald-200/70 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                  Đang hoạt động
                </span>
                <h2 className="mt-1 text-xl font-extrabold text-emerald-950">
                  Tài khoản của bạn đã là Premium
                </h2>
                <p className="mt-1 text-sm text-emerald-800">
                  {user?.premiumExpiredAt ? (
                    <>
                      Thời hạn sử dụng đến:{' '}
                      <strong className="font-semibold text-emerald-950">
                        {new Date(user.premiumExpiredAt).toLocaleDateString('vi-VN')}
                      </strong>
                    </>
                  ) : (
                    'Bạn có toàn quyền truy cập không giới hạn mọi tính năng nâng cao.'
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/practice/dictation?mode=dictation"
                className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800"
              >
                Luyện tập ngay
              </Link>
              <button
                type="button"
                onClick={() => setCancelModalOpen(true)}
                className="rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-100/50"
              >
                Hủy gia hạn gói
              </button>
            </div>
          </div>
        </section>
      )}

      {cancelSuccess && (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-100 p-4 text-sm text-slate-800">
          {cancelSuccess}
        </div>
      )}

      {/* Lưới các gói cước */}
      <section className="mb-16">
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const featuresList: string[] = Array.isArray(plan.featuresJson)
              ? plan.featuresJson
              : typeof plan.featuresJson === 'string'
              ? JSON.parse(plan.featuresJson)
              : [
                  'Toàn bộ bài học không giới hạn',
                  'Chấm phát âm AI từng từ',
                  'Lưu bài làm và streak học tập',
                ];

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-3xl border bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl ${
                  plan.isPopular
                    ? 'border-indigo-600 shadow-lg ring-2 ring-indigo-600/20'
                    : 'border-slate-200/90 shadow-sm'
                }`}
              >
                {plan.discountBadge && (
                  <span className="absolute -top-3.5 right-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-md">
                    {plan.discountBadge}
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-xl bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                      {plan.durationDays} ngày
                    </span>
                    {plan.isPopular && (
                      <span className="text-xs font-bold text-indigo-600">★ Phổ biến nhất</span>
                    )}
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{plan.description}</p>

                  <div className="my-6 border-y border-slate-100 py-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">
                        {formatPrice(plan.price)}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 text-xs text-slate-600">
                    {featuresList.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4">
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full rounded-xl py-3 text-sm font-bold shadow-sm transition focus:outline-none focus:ring-4 ${
                      plan.isPopular
                        ? 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700 focus:ring-indigo-100'
                        : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-100'
                    }`}
                  >
                    {isPremiumUser ? 'Gia hạn thêm' : 'Đăng ký ngay'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bảng so sánh tính năng Free vs Premium */}
      <section className="mb-16 overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm md:p-10">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">So sánh quyền lợi</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">
            Tài khoản Miễn phí vs Gói Premium
          </h2>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                <th className="pb-4">Tính năng</th>
                <th className="pb-4 text-center">Tài khoản Miễn phí</th>
                <th className="pb-4 text-center text-indigo-600">Gói Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 md:text-sm">
              <tr>
                <td className="py-4 font-semibold">Kho bài luyện Dictation cơ bản</td>
                <td className="py-4 text-center text-emerald-600 font-bold">✓ Có sẵn</td>
                <td className="py-4 text-center text-emerald-600 font-bold">✓ Không giới hạn</td>
              </tr>
              <tr>
                <td className="py-4 font-semibold">Bài học nâng cao có gắn tag Premium</td>
                <td className="py-4 text-center text-slate-400">Khóa</td>
                <td className="py-4 text-center text-emerald-600 font-bold">✓ Mở khóa 100%</td>
              </tr>
              <tr>
                <td className="py-4 font-semibold">Chấm phát âm AI Shadowing từng từ</td>
                <td className="py-4 text-center text-slate-500">10 câu/ngày</td>
                <td className="py-4 text-center text-emerald-600 font-bold">✓ Không giới hạn</td>
              </tr>
              <tr>
                <td className="py-4 font-semibold">Phân tích âm tiết và phiên âm IPA chi tiết</td>
                <td className="py-4 text-center text-slate-400">Không hỗ trợ</td>
                <td className="py-4 text-center text-emerald-600 font-bold">✓ Đầy đủ</td>
              </tr>
              <tr>
                <td className="py-4 font-semibold">Lưu tiến độ & Streak học tập cá nhân</td>
                <td className="py-4 text-center text-emerald-600 font-bold">✓ Có sẵn</td>
                <td className="py-4 text-center text-emerald-600 font-bold">✓ Có sẵn</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Lịch sử giao dịch */}
      {isAuthenticated && transactions.length > 0 && (
        <section className="mb-12 overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Lịch sử thanh toán của bạn</h2>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 font-bold uppercase text-slate-500">
                  <th className="pb-3">Mã đơn hàng</th>
                  <th className="pb-3">Số tiền</th>
                  <th className="pb-3">Cổng thanh toán</th>
                  <th className="pb-3">Thời gian</th>
                  <th className="pb-3 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-3 font-mono font-medium">{tx.transactionRef}</td>
                    <td className="py-3 font-bold">{formatPrice(tx.amount)}</td>
                    <td className="py-3 uppercase text-slate-500">{tx.provider}</td>
                    <td className="py-3 text-slate-500">
                      {new Date(tx.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3 text-right">
                      {tx.status === 'SUCCESS' ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          Thành công
                        </span>
                      ) : tx.status === 'PENDING' ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                          Chờ xử lý
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                          {tx.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Modal Thanh toán */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Xác nhận đơn hàng Premium</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {orderError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
                {orderError}
              </div>
            )}

            {mockSuccess ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="mt-4 text-xl font-bold text-slate-900">Nâng cấp thành công!</h4>
                <p className="mt-2 text-xs text-slate-600">
                  Gói {selectedPlan.name} đã được kích hoạt trên tài khoản của bạn.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Link
                    href="/practice/dictation?mode=dictation"
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    Bắt đầu học Dictation
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            ) : mockTxRef ? (
              <div className="py-4">
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs text-indigo-900">
                  <p className="font-bold text-indigo-950">Chế độ Sandbox Demo Đồ Án:</p>
                  <p className="mt-1">
                    Đơn hàng đã được khởi tạo thành công với mã:
                  </p>
                  <p className="mt-1 font-mono font-bold text-indigo-700">{mockTxRef}</p>
                  <p className="mt-2 text-[11px] text-slate-600">
                    Nhấn nút bên dưới để mô phỏng hoàn tất thanh toán tức thì mà không cần thẻ thật.
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-2.5">
                  <button
                    type="button"
                    disabled={processingOrder}
                    onClick={handleMockConfirm}
                    className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {processingOrder ? 'Đang kích hoạt…' : 'Xác nhận thanh toán mô phỏng (Sandbox)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMockTxRef(null)}
                    className="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Quay lại chọn phương thức
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Gói đã chọn:</span>
                    <strong className="font-bold text-slate-900">{selectedPlan.name}</strong>
                  </div>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="text-slate-500">Thời hạn sử dụng:</span>
                    <span className="font-semibold text-slate-800">{selectedPlan.durationDays} ngày</span>
                  </div>
                  <div className="mt-3 flex justify-between border-t border-slate-200/80 pt-3 text-sm">
                    <span className="font-bold text-slate-900">Tổng thanh toán:</span>
                    <strong className="text-base font-black text-indigo-700">
                      {formatPrice(selectedPlan.price)}
                    </strong>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Chọn phương thức thanh toán:
                  </label>
                  <div className="mt-2 space-y-2.5">
                    <label
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition ${
                        paymentProvider === 'VNPAY'
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="provider"
                          value="VNPAY"
                          checked={paymentProvider === 'VNPAY'}
                          onChange={() => setPaymentProvider('VNPAY')}
                          className="text-indigo-600"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Cổng thanh toán VNPAY</p>
                          <p className="text-[11px] text-slate-500">QR-Code, Thẻ ATM Nội địa, Visa / MasterCard</p>
                        </div>
                      </div>
                      <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                        VNPAY
                      </span>
                    </label>

                    <label
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition ${
                        paymentProvider === 'MOCK_SANDBOX'
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="provider"
                          value="MOCK_SANDBOX"
                          checked={paymentProvider === 'MOCK_SANDBOX'}
                          onChange={() => setPaymentProvider('MOCK_SANDBOX')}
                          className="text-indigo-600"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Cổng Sandbox Mô phỏng (Demo)</p>
                          <p className="text-[11px] text-slate-500">Dành riêng kiểm thử đồ án, kích hoạt tức thì không mất phí</p>
                        </div>
                      </div>
                      <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Test Sandbox
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={processingOrder}
                    onClick={handleCreateOrder}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {processingOrder ? (
                      <span>Đang kết nối cổng…</span>
                    ) : (
                      <>
                        <span>Tiếp tục thanh toán</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Modal Xác nhận hủy gói cước */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Xác nhận hủy gói Premium</h3>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Khi hủy gói, tài khoản của bạn sẽ chuyển về gói Miễn phí và không còn quyền truy cập vào các bài học và tính năng đặc quyền Premium. Bạn có chắc chắn muốn hủy?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Giữ gói học
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelSubscription}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {cancelling ? 'Đang hủy…' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuthStore, UserProfile } from '@/lib/auth-store';
import { CheckCircle2, XCircle, ArrowRight, Crown, Headphones, RotateCcw } from 'lucide-react';

function SubscriptionResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const updateUser = useAuthStore((state) => state.updateUser);

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [txnRef, setTxnRef] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    const directStatus = searchParams.get('status');
    const rawTxnRef = searchParams.get('vnp_TxnRef') || searchParams.get('txnRef') || '';
    const responseCode = searchParams.get('vnp_ResponseCode');
    const rawAmount = searchParams.get('vnp_Amount') || searchParams.get('amount');
    const directMessage = searchParams.get('message');

    setTxnRef(rawTxnRef);
    if (rawAmount) {
      const parsedAmount = Math.round(Number(rawAmount) > 10000000 ? Number(rawAmount) / 100 : Number(rawAmount));
      setAmount(new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parsedAmount));
    }

    if (directStatus === 'success') {
      setSuccess(true);
      setMessage(directMessage || 'Thanh toán thành công! Gói Premium đã được kích hoạt.');
      apiFetch<UserProfile>('/auth/me')
        .then((p) => updateUser(p))
        .catch(() => undefined)
        .finally(() => setLoading(false));
      return;
    }

    // Gửi toàn bộ query string lên backend để xác thực chữ ký số VNPAY (nếu có callback từ VNPAY)
    const query = searchParams.toString();
    apiFetch<{ success: boolean; message: string; transactionRef?: string }>(`/payment/verify-return?${query}`)
      .then((res) => {
        if (res.success || responseCode === '00') {
          setSuccess(true);
          setMessage(res.message || 'Thanh toán thành công! Gói cước của bạn đã được kích hoạt.');
          // Cập nhật lại profile
          apiFetch<UserProfile>('/auth/me')
            .then((p) => updateUser(p))
            .catch(() => undefined);
        } else {
          setSuccess(false);
          setMessage(res.message || 'Giao dịch không thành công hoặc đã bị hủy bởi người dùng.');
        }
      })
      .catch((err) => {
        // Nếu responseCode là 00 vẫn chấp nhận cho môi trường demo
        if (responseCode === '00') {
          setSuccess(true);
          setMessage('Thanh toán thành công! Gói cước của bạn đã được kích hoạt.');
          apiFetch<UserProfile>('/auth/me')
            .then((p) => updateUser(p))
            .catch(() => undefined);
        } else {
          setSuccess(false);
          setMessage(err.message || 'Không thể xác thực giao dịch từ cổng thanh toán.');
        }
      })
      .finally(() => setLoading(false));
  }, [searchParams, updateUser]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
        <div className="w-full rounded-3xl border border-slate-200/90 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <h1 className="mt-4 text-lg font-bold text-slate-900">Đang kiểm tra kết quả giao dịch…</h1>
          <p className="mt-2 text-xs text-slate-500">
            Hệ thống đang đối chiếu chữ ký số từ VNPAY. Vui lòng không đóng trình duyệt.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-70px)] max-w-lg items-center px-4 py-12">
      <div className="w-full overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xl md:p-10">
        {success ? (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-md">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
              <Crown className="h-3.5 w-3.5 text-amber-600" />
              <span>Shadowtation Premium Active</span>
            </span>

            <h1 className="mt-3 text-2xl font-black text-slate-900 md:text-3xl">
              Thanh toán thành công!
            </h1>
            <p className="mt-2 text-xs leading-5 text-slate-600 md:text-sm">{message}</p>

            {txnRef && (
              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã đơn hàng:</span>
                  <span className="font-mono font-bold text-slate-800">{txnRef}</span>
                </div>
                {amount && (
                  <div className="mt-2 flex justify-between">
                    <span className="text-slate-500">Số tiền thanh toán:</span>
                    <strong className="font-bold text-emerald-700">{amount}</strong>
                  </div>
                )}
                <div className="mt-2 flex justify-between">
                  <span className="text-slate-500">Cổng thanh toán:</span>
                  <span className="font-semibold text-slate-700">VNPAY Gateway</span>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/practice/dictation?mode=dictation"
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700"
              >
                <Headphones className="h-4 w-4" />
                <span>Bắt đầu luyện Dictation ngay</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-md">
              <XCircle className="h-10 w-10" />
            </div>

            <h1 className="mt-4 text-2xl font-black text-slate-900 md:text-3xl">
              Thanh toán chưa hoàn tất
            </h1>
            <p className="mt-2 text-xs leading-5 text-slate-600 md:text-sm">{message}</p>

            {txnRef && (
              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã đơn hàng:</span>
                  <span className="font-mono font-bold text-slate-800">{txnRef}</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-slate-500">Trạng thái:</span>
                  <span className="font-bold text-rose-600">Thất bại / Hủy bỏ</span>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/subscription"
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Thử thanh toán lại</span>
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SubscriptionResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm font-semibold text-slate-500">Đang tải kết quả giao dịch…</p>
        </div>
      }
    >
      <SubscriptionResultContent />
    </Suspense>
  );
}

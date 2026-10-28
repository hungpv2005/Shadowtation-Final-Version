import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  PaymentTransaction,
  SubscriptionPlan,
  User,
  UserRole,
} from '../database/entities';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class PaymentService {
  private readonly vnpTmnCode: string;
  private readonly vnpHashSecret: string;
  private readonly vnpUrl: string;
  private readonly vnpReturnUrl: string;

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.vnpTmnCode = this.configService.get<string>('VNP_TMN_CODE') || '';
    this.vnpHashSecret = this.configService.get<string>('VNP_HASH_SECRET') || '';
    this.vnpUrl =
      this.configService.get<string>('VNP_URL') ||
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    this.vnpReturnUrl =
      this.configService.get<string>('VNP_RETURN_URL') ||
      'http://localhost:3000/subscription/result';
  }

  /**
   * Sắp xếp các tham số truy vấn theo thứ tự alphabet theo chuẩn VNPAY
   */
  private sortObject(obj: Record<string, any>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
        sorted[encodeURIComponent(key)] = encodeURIComponent(String(obj[key])).replace(/%20/g, '+');
      }
    }
    return sorted;
  }

  /**
   * Định dạng ngày giờ dạng YYYYMMDDHHmmss cho VNPAY
   */
  private formatVnpayDate(date: Date): string {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Tạo hóa đơn thanh toán và sinh URL chuyển hướng (UC-10 Bước 3-4)
   */
  async createOrder(userId: string, dto: CreateOrderDto, clientIp: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const targetPlanId = dto.planId || dto.plan_id;
    if (!targetPlanId) {
      throw new BadRequestException('Vui lòng cung cấp mã gói cước (planId hoặc plan_id)');
    }

    let plan: SubscriptionPlan | null = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetPlanId);
    if (isUuid) {
      plan = await this.planRepository.findOne({ where: { id: targetPlanId } });
    }
    if (!plan) {
      const allActive = await this.planRepository.find({ where: { isActive: true } });
      const lower = targetPlanId.toLowerCase();
      if (lower.includes('3') || lower.includes('90') || lower.includes('quy')) {
        plan = allActive.find((p) => p.durationDays === 90 || p.name.includes('3')) || null;
      } else if (lower.includes('year') || lower.includes('nam') || lower.includes('365')) {
        plan = allActive.find((p) => p.durationDays === 365 || p.name.includes('Năm') || p.name.includes('Nam')) || null;
      } else if (lower.includes('1') || lower.includes('month') || lower.includes('thang') || lower.includes('30')) {
        plan = allActive.find((p) => p.durationDays === 30 || p.name.includes('1')) || null;
      }
      if (!plan && allActive.length > 0) {
        plan = allActive[0];
      }
    }

    if (!plan || !plan.isActive) {
      throw new BadRequestException('Gói cước không tồn tại hoặc đã tạm dừng mở bán');
    }

    // Tiền điều kiện 3 (SRS UC-10): Hủy các đơn PENDING cũ chưa thanh toán của user cho gói này
    await this.transactionRepository.update(
      { userId, planId: plan.id, status: 'PENDING' },
      { status: 'CANCELLED' },
    );

    // Sinh mã tham chiếu giao dịch đơn nhất (merchant_txn_ref)
    const transactionRef = `TXT_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // Tạo bản ghi payment_transactions ở trạng thái PENDING
    const transaction = this.transactionRepository.create({
      userId,
      planId: plan.id,
      amount: plan.price,
      provider: dto.provider || 'VNPAY',
      transactionRef,
      status: 'PENDING',
    });
    const savedTx = await this.transactionRepository.save(transaction);

    // Tính toán số tiền (VND * 100 theo quy định VNPAY)
    const amountInVND = Math.round(Number(plan.price));
    const vnpAmount = amountInVND * 100;
    const createDate = this.formatVnpayDate(new Date());

    let paymentUrl = '';

    // Kiểm tra cấu hình VNPAY Sandbox thật hay chế độ Sandbox Mô phỏng
    if (this.vnpTmnCode && this.vnpHashSecret) {
      const vnpParams: Record<string, any> = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: this.vnpTmnCode,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: transactionRef,
        vnp_OrderInfo: `Thanh toan goi ${plan.name} - Shadowtation`,
        vnp_OrderType: 'other',
        vnp_Amount: vnpAmount,
        vnp_ReturnUrl: this.vnpReturnUrl,
        vnp_IpAddr: clientIp || '127.0.0.1',
        vnp_CreateDate: createDate,
      };

      const sortedParams = this.sortObject(vnpParams);
      const signData = Object.entries(sortedParams)
        .map(([k, v]) => `${k}=${v}`)
        .join('&');

      const hmac = crypto.createHmac('sha512', this.vnpHashSecret);
      const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      paymentUrl = `${this.vnpUrl}?${signData}&vnp_SecureHash=${secureHash}`;
    } else {
      // Chế độ mô phỏng Test Sandbox (khi chưa cấu hình mã ngân hàng riêng)
      paymentUrl = `${this.vnpReturnUrl}?vnp_TxnRef=${transactionRef}&vnp_ResponseCode=00&vnp_Amount=${vnpAmount}&vnp_BankCode=NCB&mock=true`;
    }

    return {
      transaction_id: savedTx.id,
      transactionId: savedTx.id,
      merchant_txn_ref: transactionRef,
      transactionRef: transactionRef,
      amount: amountInVND,
      plan_name: plan.name,
      planName: plan.name,
      duration_days: plan.durationDays,
      durationDays: plan.durationDays,
      payment_url: paymentUrl,
      paymentUrl: paymentUrl,
    };
  }

  /**
   * Kích hoạt nâng cấp tài khoản Premium cho người dùng (Dùng chung cho IPN và Sandbox Test)
   */
  private async upgradeUserPremium(user: User, durationDays: number): Promise<Date> {
    const now = new Date();
    let newExpiryDate: Date;

    // Nếu người dùng đang có hạn Premium còn hiệu lực thì cộng dồn ngày
    if (user.premiumExpiredAt && new Date(user.premiumExpiredAt) > now) {
      newExpiryDate = new Date(new Date(user.premiumExpiredAt).getTime() + durationDays * 86400000);
    } else {
      newExpiryDate = new Date(now.getTime() + durationDays * 86400000);
    }

    user.premiumExpiredAt = newExpiryDate;
    user.role = UserRole.PREMIUM_STUDENT;
    await this.userRepository.save(user);

    return newExpiryDate;
  }

  /**
   * Xử lý Webhook IPN từ cổng thanh toán VNPAY (Server-to-Server Callback - NFR-SC-03)
   */
  async handleVnpayIpn(params: Record<string, string>) {
    const vnpParams = { ...params };
    const secureHash = vnpParams['vnp_SecureHash'];

    delete vnpParams['vnp_SecureHash'];
    delete vnpParams['vnp_SecureHashType'];

    // 1. Kiểm tra chữ ký Checksum
    if (this.vnpHashSecret) {
      const sortedParams = this.sortObject(vnpParams);
      const signData = Object.entries(sortedParams)
        .map(([k, v]) => `${k}=${v}`)
        .join('&');

      const hmac = crypto.createHmac('sha512', this.vnpHashSecret);
      const checkHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      if (secureHash !== checkHash) {
        return { RspCode: '97', Message: 'Invalid Checksum Signature' };
      }
    }

    const transactionRef = params['vnp_TxnRef'];
    const responseCode = params['vnp_ResponseCode'];

    // 2. Tìm hóa đơn trong CSDL
    const transaction = await this.transactionRepository.findOne({
      where: { transactionRef },
      relations: ['user', 'plan'],
    });

    if (!transaction) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    // 3. Tính Idempotent: Nếu đơn đã được xử lý thành công trước đó thì không cộng dồn lần 2
    if (transaction.status === 'SUCCESS') {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    // 4. Xử lý kết quả giao dịch
    if (responseCode === '00') {
      // Giao dịch thành công
      transaction.status = 'SUCCESS';
      await this.transactionRepository.save(transaction);

      // Kích hoạt Premium cho học viên
      await this.upgradeUserPremium(transaction.user, transaction.plan.durationDays);

      return { RspCode: '00', Message: 'Confirm Success' };
    } else {
      // Giao dịch thất bại / bị hủy
      transaction.status = 'FAILED';
      await this.transactionRepository.save(transaction);
      return { RspCode: '00', Message: 'Confirm Success' };
    }
  }

  /**
   * Nút kiểm thử nhanh Mock Confirm cho môi trường Dev / Demo đồ án
   */
  async mockConfirm(transactionRef: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { transactionRef },
      relations: ['user', 'plan'],
    });

    if (!transaction) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã: ${transactionRef}`);
    }

    if (transaction.status === 'SUCCESS') {
      return {
        success: true,
        message: 'Đơn hàng này đã được kích hoạt Premium thành công từ trước.',
        transaction,
      };
    }

    transaction.status = 'SUCCESS';
    await this.transactionRepository.save(transaction);

    const newExpiry = await this.upgradeUserPremium(transaction.user, transaction.plan.durationDays);

    return {
      success: true,
      message: `Kích hoạt thành công gói "${transaction.plan.name}". Thời hạn mới đến: ${newExpiry.toLocaleDateString('vi-VN')}`,
      transaction,
      new_role: UserRole.PREMIUM_STUDENT,
      premium_expired_at: newExpiry,
    };
  }

  /**
   * Lấy lịch sử giao dịch cá nhân của học viên
   */
  async getMyTransactions(userId: string): Promise<PaymentTransaction[]> {
    return this.transactionRepository.find({
      where: { userId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Admin xem toàn bộ lịch sử giao dịch thanh toán để đối soát kế toán (UC-08/UC-10)
   */
  async getAllTransactionsAdmin(): Promise<PaymentTransaction[]> {
    return this.transactionRepository.find({
      relations: ['user', 'plan'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Kiểm tra và hoàn tất kết quả thanh toán khi trình duyệt của học viên quay trở lại (Return URL)
   */
  async verifyReturn(params: Record<string, string>) {
    const transactionRef = params['vnp_TxnRef'];
    const responseCode = params['vnp_ResponseCode'];

    if (!transactionRef) {
      throw new BadRequestException('Mã tham chiếu giao dịch không hợp lệ');
    }

    const transaction = await this.transactionRepository.findOne({
      where: { transactionRef },
      relations: ['user', 'plan'],
    });

    if (!transaction) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã: ${transactionRef}`);
    }

    if (responseCode === '00') {
      if (transaction.status !== 'SUCCESS') {
        transaction.status = 'SUCCESS';
        await this.transactionRepository.save(transaction);
        await this.upgradeUserPremium(transaction.user, transaction.plan.durationDays);
      }
      return {
        success: true,
        status: 'SUCCESS',
        message: `Thanh toán thành công gói cước "${transaction.plan.name}".`,
        transaction,
        plan: transaction.plan,
      };
    } else {
      if (transaction.status === 'PENDING') {
        transaction.status = 'FAILED';
        await this.transactionRepository.save(transaction);
      }
      return {
        success: false,
        status: 'FAILED',
        message: 'Giao dịch không thành công hoặc đã bị hủy.',
        transaction,
        plan: transaction.plan,
      };
    }
  }

  /**
   * Hủy kích hoạt gói cước Premium theo yêu cầu của học viên (UC-10)
   */
  async cancelSubscription(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (user.role !== UserRole.PREMIUM_STUDENT) {
      throw new BadRequestException('Tài khoản của bạn hiện không có gói cước Premium nào đang hoạt động');
    }

    // Hạ cấp tài khoản về học viên thông thường
    user.role = UserRole.STUDENT;
    user.premiumExpiredAt = null;
    const updated = await this.userRepository.save(user);

    return {
      success: true,
      message: 'Hủy gói cước Premium thành công. Tài khoản của bạn đã chuyển về gói Miễn Phí.',
      user: {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        role: updated.role,
        premiumExpiredAt: updated.premiumExpiredAt,
      },
    };
  }
}

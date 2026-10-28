import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-order')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Khởi tạo đơn hàng thanh toán Premium và nhận URL chuyển hướng' })
  @ApiResponse({ status: 201, description: 'Tạo đơn hàng thành công, trả về URL thanh toán' })
  async createOrder(
    @Req() req: any,
    @Body() dto: CreateOrderDto,
    @Ip() clientIp: string,
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.paymentService.createOrder(userId, dto, clientIp);
  }

  @Get('vnpay-ipn')
  @ApiOperation({ summary: 'Webhook IPN tiếp nhận kết quả thanh toán từ VNPAY (GET method)' })
  async handleVnpayIpnGet(@Query() query: Record<string, string>) {
    return this.paymentService.handleVnpayIpn(query);
  }

  @Post('vnpay-webhook')
  @ApiOperation({ summary: 'Webhook IPN tiếp nhận kết quả thanh toán từ VNPAY (POST method)' })
  async handleVnpayWebhookPost(@Body() body: Record<string, string>) {
    return this.paymentService.handleVnpayIpn(body);
  }

  @Get('verify-return')
  @ApiOperation({ summary: 'Xác thực và cập nhật đơn hàng khi người dùng quay lại từ VNPAY Return URL' })
  async verifyReturn(@Query() query: Record<string, string>) {
    return this.paymentService.verifyReturn(query);
  }

  @Post('mock-confirm/:transactionRef')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Xác nhận thanh toán Sandbox mô phỏng (Dùng cho Demo/Báo cáo đồ án)' })
  async mockConfirm(@Param('transactionRef') transactionRef: string) {
    return this.paymentService.mockConfirm(transactionRef);
  }

  @Get('my-transactions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Xem lịch sử các đơn hàng thanh toán của học viên' })
  async getMyTransactions(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.paymentService.getMyTransactions(userId);
  }

  @Get('admin/transactions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin xem toàn bộ lịch sử thanh toán toàn hệ thống để đối soát kế toán' })
  async getAllTransactionsAdmin() {
    return this.paymentService.getAllTransactionsAdmin();
  }

  @Post('cancel-subscription')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Học viên chủ động hủy gói cước Premium, chuyển về tài khoản Miễn phí' })
  async cancelSubscription(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.paymentService.cancelSubscription(userId);
  }
}

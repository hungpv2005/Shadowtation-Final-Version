import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { SubscriptionPlan, UserRole } from '../database/entities';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';

@ApiTags('admin/subscription-plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/subscription-plans')
export class AdminSubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @ApiOperation({ summary: 'Admin lấy toàn bộ danh sách gói cước (bao gồm cả các gói đã ẩn/tắt)' })
  @ApiResponse({ status: 200, description: 'Danh sách toàn bộ gói cước' })
  async getAllPlansForAdmin(): Promise<SubscriptionPlan[]> {
    return this.subscriptionService.findAllAdmin();
  }

  @Post()
  @ApiOperation({ summary: 'Admin tạo mới gói cước Premium' })
  @ApiResponse({ status: 201, description: 'Tạo gói cước thành công' })
  async createPlan(@Body() dto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    return this.subscriptionService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Admin cập nhật gói cước' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói cước' })
  async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    return this.subscriptionService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin xóa hoặc tắt trạng thái mở bán gói cước (bảo vệ lịch sử giao dịch)' })
  @ApiResponse({ status: 200, description: 'Xử lý xóa/ẩn gói cước thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói cước' })
  async deletePlan(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionService.deleteOrDeactivate(id);
  }
}

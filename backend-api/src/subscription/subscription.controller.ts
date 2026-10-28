import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { SubscriptionPlan } from '../database/entities';

@ApiTags('subscription-plans')
@Controller(['subscription-plans', 'subscription/plans'])
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các gói cước Premium đang mở bán (Public)' })
  @ApiResponse({ status: 200, description: 'Danh sách các gói cước đang hoạt động' })
  async getActivePlans(): Promise<SubscriptionPlan[]> {
    return this.subscriptionService.findAllActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem thông tin chi tiết một gói cước' })
  @ApiResponse({ status: 200, description: 'Thông tin gói cước' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói cước' })
  async getPlanById(@Param('id', ParseUUIDPipe) id: string): Promise<SubscriptionPlan> {
    return this.subscriptionService.findById(id);
  }
}

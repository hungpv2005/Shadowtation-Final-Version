import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities';
import { SystemConfigService } from './system-config.service';

class UpdateConfigDto {
  value!: unknown;
  description?: string;
}

class BatchUpdateConfigDto {
  configs!: Array<{ key: string; value: unknown; description?: string }>;
}

@ApiTags('admin/system-configs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/system-configs')
export class AdminSystemConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Admin lấy danh sách toàn bộ cấu hình hệ thống' })
  @ApiResponse({ status: 200, description: 'Danh sách cấu hình hiện tại' })
  async getAll() {
    return this.configService.getAll();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Admin lấy thông tin cấu hình theo mã (key)' })
  @ApiResponse({ status: 200, description: 'Thông tin cấu hình' })
  async getByKey(@Param('key') key: string) {
    return this.configService.getByKey(key);
  }

  @Put(':key')
  @ApiOperation({ summary: 'Admin cập nhật giá trị của một cấu hình' })
  @ApiResponse({ status: 200, description: 'Cập nhật cấu hình thành công' })
  async update(@Param('key') key: string, @Body() body: UpdateConfigDto) {
    return this.configService.update(key, body.value, body.description);
  }

  @Put()
  @ApiOperation({ summary: 'Admin cập nhật hàng loạt nhiều cấu hình cùng lúc' })
  @ApiResponse({ status: 200, description: 'Cập nhật toàn bộ cấu hình thành công' })
  async updateBatch(@Body() body: BatchUpdateConfigDto) {
    return this.configService.updateBatch(body.configs);
  }

  @Post('reset-defaults')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin khôi phục cấu hình hệ thống về giá trị mặc định ban đầu' })
  @ApiResponse({ status: 200, description: 'Đã khôi phục cài đặt mặc định' })
  async resetToDefaults() {
    return this.configService.resetToDefaults();
  }
}

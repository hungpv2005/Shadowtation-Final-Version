import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserRole } from '../database/entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@ApiTags('Admin Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class AdminUserController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'Admin lấy danh sách tài khoản người dùng (hỗ trợ tìm kiếm & lọc vai trò, trạng thái)' })
  @ApiQuery({ name: 'q', required: false, description: 'Tìm kiếm theo email hoặc họ tên' })
  @ApiQuery({ name: 'role', required: false, enum: ['STUDENT', 'PREMIUM_STUDENT', 'ADMIN', 'ALL'] })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'ALL'] })
  @ApiResponse({ status: 200, description: 'Danh sách tài khoản người dùng' })
  async getUsers(
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.authService.findAllUsersAdmin({ q, role, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin xem chi tiết thông tin và lịch sử tài khoản' })
  @ApiResponse({ status: 200, description: 'Chi tiết tài khoản người dùng' })
  async getUserDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.authService.findUserByIdAdmin(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Admin khóa hoặc mở khóa tài khoản người dùng' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
    @Req() req: any,
  ) {
    const adminUserId = req.user?.id;
    return this.authService.updateUserStatusAdmin(adminUserId, id, Boolean(isActive));
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Admin thay đổi vai trò tài khoản người dùng' })
  @ApiResponse({ status: 200, description: 'Cập nhật vai trò thành công' })
  async updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('role') role: UserRole,
    @Req() req: any,
  ) {
    const adminUserId = req.user?.id;
    return this.authService.updateUserRoleAdmin(adminUserId, id, role);
  }
}

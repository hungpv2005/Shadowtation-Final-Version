import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '../database/entities/user.entity';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginThrottlerGuard } from './guards/login-throttler.guard';
import { Throttle, seconds } from '@nestjs/throttler';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}


  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản học viên' })
  @ApiResponse({ status: 201, type: AuthResponseDto, description: 'Đăng ký thành công' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @UseGuards(LoginThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: seconds(60) } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập vào hệ thống (giới hạn 5 lần thử)' })
  @ApiResponse({ status: 200, type: AuthResponseDto, description: 'Đăng nhập thành công' })
  @ApiResponse({ status: 429, description: 'Quá nhiều lần thử đăng nhập thất bại liên tiếp' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới Access Token bằng Refresh Token' })
  @ApiResponse({ status: 200, type: AuthResponseDto, description: 'Làm mới token thành công' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất khỏi hệ thống' })
  async logout(
    @CurrentUser('id') userId: string,
    @Body() dto?: Partial<RefreshTokenDto>,
  ) {
    return this.authService.logout(userId, dto?.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin tài khoản hiện tại' })
  @ApiResponse({ status: 200, type: UserProfileDto, description: 'Thông tin tài khoản' })
  async getMe(@CurrentUser() user: User): Promise<UserProfileDto> {
    return this.authService.getMe(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('me')
  @ApiOperation({ summary: 'Cập nhật thông tin tài khoản hiện tại' })
  @ApiResponse({ status: 200, type: UserProfileDto, description: 'Thông tin tài khoản đã cập nhật' })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() body: { fullName?: string },
  ): Promise<UserProfileDto> {
    return this.authService.updateProfile(userId, body);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Yêu cầu gửi token đặt lại mật khẩu' })
  @ApiResponse({ status: 200, description: 'Hướng dẫn khôi phục mật khẩu đã được gửi' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu mới bằng token' })
  @ApiResponse({ status: 200, description: 'Đặt lại mật khẩu thành công' })
  @ApiResponse({ status: 400, description: 'Token không hợp lệ hoặc đã hết hạn' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Get('google')
  @ApiOperation({ summary: 'Chuyển hướng người dùng đến trang xác thực Google OAuth2' })
  googleAuth(@Res() res: Response) {
    const frontendUrl = (this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')).split(',')[0].trim();
    try {
      const url = this.authService.getGoogleAuthUrl();
      return res.redirect(url);
    } catch (err: any) {
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(
          err.message || 'Chưa cấu hình GOOGLE_CLIENT_ID trong file .env',
        )}`,
      );
    }
  }

  @Public()
  @Get('google/callback')
  @ApiOperation({ summary: 'Google chuyển hướng trả về auth code để nhận JWT' })
  async googleAuthCallback(
    @Query('code') code: string,
    @Query('error') googleError: string,
    @Res() res: Response,
  ) {
    const frontendUrl = (this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')).split(',')[0].trim();

    if (googleError || !code) {
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(
          googleError || 'Bạn đã hủy đăng nhập bằng Google',
        )}`,
      );
    }

    try {
      const authResult = await this.authService.handleGoogleCallback(code);
      return res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${encodeURIComponent(
          authResult.accessToken,
        )}&refreshToken=${encodeURIComponent(authResult.refreshToken)}`,
      );
    } catch (err: any) {
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(
          err.message || 'Lỗi khi xác thực tài khoản Google',
        )}`,
      );
    }
  }
}



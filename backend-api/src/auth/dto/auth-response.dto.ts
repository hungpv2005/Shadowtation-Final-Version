import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../database/entities/user.entity';

export class UserProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty()
  streakCount!: number;

  @ApiProperty({ nullable: true })
  premiumExpiredAt!: Date | null;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT Access Token có hạn 15 phút' })
  accessToken!: string;

  @ApiProperty({ description: 'JWT Refresh Token có hạn 7 ngày' })
  refreshToken!: string;

  @ApiProperty({ type: UserProfileDto })
  user!: UserProfileDto;
}

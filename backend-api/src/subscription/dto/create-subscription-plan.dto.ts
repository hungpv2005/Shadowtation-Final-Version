import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'Premium 1 Tháng', description: 'Tên gói dịch vụ cước' })
  @IsString({ message: 'Tên gói cước phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên gói cước không được để trống' })
  name!: string;

  @ApiProperty({ example: 199000, description: 'Giá tiền (VND)' })
  @IsNumber({}, { message: 'Giá tiền phải là số hợp lệ' })
  @Min(0, { message: 'Giá tiền không được âm' })
  price!: number;

  @ApiProperty({ example: 30, description: 'Số ngày hiệu lực (ngày)' })
  @IsInt({ message: 'Số ngày hiệu lực phải là số nguyên' })
  @Min(1, { message: 'Số ngày hiệu lực phải lớn hơn 0' })
  durationDays!: number;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái kích hoạt (mặc định: true)' })
  @IsBoolean({ message: 'Trạng thái isActive phải là boolean' })
  @IsOptional()
  isActive?: boolean;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSubscriptionPlanDto {
  @ApiPropertyOptional({ example: 'Premium 1 Tháng (Ưu đãi)', description: 'Tên gói dịch vụ cước' })
  @IsString({ message: 'Tên gói cước phải là chuỗi' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 149000, description: 'Giá tiền (VND)' })
  @IsNumber({}, { message: 'Giá tiền phải là số hợp lệ' })
  @Min(0, { message: 'Giá tiền không được âm' })
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ example: 30, description: 'Số ngày hiệu lực (ngày)' })
  @IsInt({ message: 'Số ngày hiệu lực phải là số nguyên' })
  @Min(1, { message: 'Số ngày hiệu lực phải lớn hơn 0' })
  @IsOptional()
  durationDays?: number;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái kích hoạt' })
  @IsBoolean({ message: 'Trạng thái isActive phải là boolean' })
  @IsOptional()
  isActive?: boolean;
}

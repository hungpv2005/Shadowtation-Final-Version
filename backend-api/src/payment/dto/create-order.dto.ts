import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @ApiPropertyOptional({
    example: '71d2c4bc-790a-4434-a781-08dbae230708',
    description: 'Mã UUID hoặc mã định danh của gói cước cần nâng cấp',
  })
  @IsString({ message: 'planId phải là chuỗi hợp lệ' })
  @IsOptional()
  planId?: string;

  @ApiPropertyOptional({
    example: '71d2c4bc-790a-4434-a781-08dbae230708',
    description: 'Mã UUID hoặc mã định danh của gói cước cần nâng cấp (snake_case)',
  })
  @IsString({ message: 'plan_id phải là chuỗi hợp lệ' })
  @IsOptional()
  plan_id?: string;

  @ApiPropertyOptional({
    example: 'VNPAY',
    enum: ['VNPAY', 'STRIPE', 'MOCK_SANDBOX'],
    default: 'VNPAY',
    description: 'Cổng thanh toán đối tác (Mặc định: VNPAY)',
  })
  @IsString({ message: 'provider phải là chuỗi' })
  @IsOptional()
  provider?: string;
}


import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { WordTiming } from '../../database/entities/lesson-sentence.entity';

export class CreateSentenceDto {
  @ApiProperty({ example: 0, description: 'Thứ tự của câu trong bài học' })
  @IsInt({ message: 'orderIndex phải là số nguyên' })
  @Min(0, { message: 'orderIndex không được âm' })
  orderIndex!: number;

  @ApiProperty({ example: 0.0, description: 'Thời điểm bắt đầu câu (giây)' })
  @IsNumber({}, { message: 'startTime phải là số thực' })
  @Min(0, { message: 'startTime không được âm' })
  startTime!: number;

  @ApiProperty({ example: 3.5, description: 'Thời điểm kết thúc câu (giây)' })
  @IsNumber({}, { message: 'endTime phải là số thực' })
  @Min(0, { message: 'endTime không được âm' })
  endTime!: number;

  @ApiProperty({ example: 'Good morning, how are you today?', description: 'Văn bản nội dung câu' })
  @IsString({ message: 'textContent phải là chuỗi' })
  @IsNotEmpty({ message: 'textContent không được để trống' })
  textContent!: string;

  @ApiPropertyOptional({
    example: [
      { word: 'Good', start: 0.0, end: 0.8 },
      { word: 'morning', start: 0.8, end: 1.5 },
    ],
    description: 'Chi tiết thời gian từng từ (JSONB). Nếu để trống, hệ thống sẽ tự động tính toán đều.',
  })
  @IsArray({ message: 'wordsJson phải là một mảng' })
  @IsOptional()
  wordsJson?: WordTiming[];
}

export class UpdateSentenceDto {
  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @IsOptional()
  orderIndex?: number;

  @ApiPropertyOptional({ example: 0.0 })
  @IsNumber()
  @IsOptional()
  startTime?: number;

  @ApiPropertyOptional({ example: 3.5 })
  @IsNumber()
  @IsOptional()
  endTime?: number;

  @ApiPropertyOptional({ example: 'Good morning, how are you today?' })
  @IsString()
  @IsOptional()
  textContent?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  wordsJson?: WordTiming[];
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LessonLevel, LessonMediaType, LessonStatus } from '../../database/entities/lesson.entity';
import { CreateSentenceDto } from './create-sentence.dto';

export class CreateLessonDto {
  @ApiProperty({ example: 'Daily English Conversation 02', description: 'Tiêu đề bài học' })
  @IsString({ message: 'Tiêu đề bài học phải là chuỗi' })
  @IsNotEmpty({ message: 'Tiêu đề bài học không được để trống' })
  title!: string;

  @ApiProperty({ enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], example: 'BEGINNER', description: 'Cấp độ bài học' })
  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], { message: 'level phải là BEGINNER, INTERMEDIATE hoặc ADVANCED' })
  level!: LessonLevel;

  @ApiProperty({ example: '/audio/daily-conversation-02.mp3', description: 'Đường dẫn hoặc URL file audio/video' })
  @IsString({ message: 'audioUrl phải là chuỗi' })
  @IsNotEmpty({ message: 'audioUrl không được để trống' })
  audioUrl!: string;

  @ApiPropertyOptional({ enum: ['AUDIO', 'VIDEO', 'PODCAST'], default: 'AUDIO', description: 'Loại phương tiện' })
  @IsEnum(['AUDIO', 'VIDEO', 'PODCAST'], { message: 'mediaType phải là AUDIO, VIDEO hoặc PODCAST' })
  @IsOptional()
  mediaType?: LessonMediaType;

  @ApiPropertyOptional({ example: 'BBC Learning English', description: 'Nguồn học liệu' })
  @IsString()
  @IsOptional()
  sourceName?: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/watch?v=...', description: 'Đường dẫn nguồn gốc' })
  @IsString()
  @IsOptional()
  sourceUrl?: string;

  @ApiPropertyOptional({ example: 120, description: 'Thời lượng bài học (giây)' })
  @IsInt({ message: 'durationSeconds phải là số nguyên' })
  @Min(0)
  @IsOptional()
  durationSeconds?: number;

  @ApiPropertyOptional({ example: false, default: false, description: 'Bài học độc quyền chỉ dành cho Premium (true/false)' })
  @IsBoolean({ message: 'isPremiumOnly phải là boolean' })
  @IsOptional()
  isPremiumOnly?: boolean;

  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT', description: 'Trạng thái bài học' })
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'], { message: 'status phải là DRAFT, PUBLISHED hoặc ARCHIVED' })
  @IsOptional()
  status?: LessonStatus;

  @ApiPropertyOptional({ type: [CreateSentenceDto], description: 'Danh sách các câu trong bài học' })
  @IsArray({ message: 'sentences phải là một mảng' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateSentenceDto)
  sentences?: CreateSentenceDto[];
}

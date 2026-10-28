import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { LessonLevel, LessonMediaType, LessonStatus } from '../../database/entities/lesson.entity';

export class UpdateLessonDto {
  @ApiPropertyOptional({ example: 'Daily English Conversation 02 (Updated)', description: 'Tiêu đề bài học' })
  @IsString({ message: 'Tiêu đề bài học phải là chuỗi' })
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], example: 'INTERMEDIATE', description: 'Cấp độ bài học' })
  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], { message: 'level phải là BEGINNER, INTERMEDIATE hoặc ADVANCED' })
  @IsOptional()
  level?: LessonLevel;

  @ApiPropertyOptional({ example: '/audio/daily-conversation-02.mp3', description: 'Đường dẫn hoặc URL file audio/video' })
  @IsString({ message: 'audioUrl phải là chuỗi' })
  @IsOptional()
  audioUrl?: string;

  @ApiPropertyOptional({ enum: ['AUDIO', 'VIDEO', 'PODCAST'], description: 'Loại phương tiện' })
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

  @ApiPropertyOptional({ example: 150, description: 'Thời lượng bài học (giây)' })
  @IsInt({ message: 'durationSeconds phải là số nguyên' })
  @Min(0)
  @IsOptional()
  durationSeconds?: number;

  @ApiPropertyOptional({ example: true, description: 'Gắn cờ độc quyền Premium' })
  @IsBoolean({ message: 'isPremiumOnly phải là boolean' })
  @IsOptional()
  isPremiumOnly?: boolean;

  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], example: 'PUBLISHED', description: 'Trạng thái bài học' })
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'], { message: 'status phải là DRAFT, PUBLISHED hoặc ARCHIVED' })
  @IsOptional()
  status?: LessonStatus;
}

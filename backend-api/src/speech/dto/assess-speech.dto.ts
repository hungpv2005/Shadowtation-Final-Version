import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AssessSpeechDto {
  @ApiProperty({
    description: 'Câu tiếng Anh mẫu cần đối chiếu phát âm (Reference Text)',
    example: 'The quick brown fox jumps over the lazy dog.',
  })
  @IsString()
  @IsNotEmpty()
  referenceText: string;

  @ApiProperty({
    description: 'ID của câu trong bài học (Lesson Sentence ID)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  sentenceId?: string;

  @ApiProperty({
    description: 'ID của lượt làm bài (Attempt ID)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  attemptId?: string;
}

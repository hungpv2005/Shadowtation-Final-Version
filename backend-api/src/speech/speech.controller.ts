import 'multer';
import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { SpeechService } from './speech.service';
import { AssessSpeechDto } from './dto/assess-speech.dto';
import { JwtAuthGuard } from '../practice/dictation/jwt-auth.guard';

@ApiTags('Speech & Pronunciation Assessment')
@Controller('speech')
export class SpeechController {
  constructor(private readonly speechService: SpeechService) {}

  @Post('assess')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Chấm điểm phát âm Shadowing',
    description: 'Nhận file ghi âm, dùng OpenAI Whisper nhận diện lời nói rồi so khớp transcript với câu mẫu.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['audio', 'referenceText'],
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
          description: 'File âm thanh (WAV, WebM, OGG, MP3)',
        },
        referenceText: {
          type: 'string',
          description: 'Câu mẫu tiếng Anh để đối chiếu',
          example: 'I love learning English every single day.',
        },
        sentenceId: {
          type: 'string',
          description: 'ID câu trong bài học (nếu có)',
        },
        attemptId: {
          type: 'string',
          description: 'ID của lượt làm bài (nếu có)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1, fieldSize: 5000, fieldNameSize: 32 } }))
  async assessPronunciation(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AssessSpeechDto,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng tải lên file âm thanh (audio)');
    }
    if (!['audio/webm', 'audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/mpga', 'audio/ogg', 'audio/mp4', 'audio/m4a', 'audio/flac'].includes(file.mimetype.split(';')[0].trim().toLowerCase())) {
      throw new BadRequestException('Định dạng âm thanh không được hỗ trợ.');
    }
    return this.speechService.assessPronunciation(file.buffer, dto.referenceText, file.mimetype);
  }

  @Get('health')
  @ApiOperation({ summary: 'Kiểm tra trạng thái cấu hình OpenAI Whisper' })
  health() {
    return this.speechService.healthCheck();
  }
}

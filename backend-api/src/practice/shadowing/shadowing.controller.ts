import 'multer';
import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../dictation/jwt-auth.guard';
import { ShadowingService } from './shadowing.service';

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const AUDIO_MIME_TYPES = new Set(['audio/webm', 'audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/mp4', 'audio/aac']);

@ApiTags('Shadowing & AI pronunciation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('practice/shadowing')
export class ShadowingController {
  constructor(private readonly shadowingService: ShadowingService) {}

  @Post('submit')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Gửi bản ghi Shadowing để chấm phát âm AI' })
  @UseInterceptors(FileInterceptor('audio_file', { limits: { fileSize: MAX_AUDIO_BYTES, files: 1, fields: 1, fieldSize: 64, fieldNameSize: 32 } }))
  submit(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const sentenceId = req.body?.sentence_id;
    if (!file) throw new BadRequestException('Vui lòng ghi âm và gửi tệp audio_file (tối đa 5 MB).');
    const mimeType = file.mimetype.split(';')[0].trim().toLowerCase();
    if (!AUDIO_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException('Định dạng âm thanh không được hỗ trợ. Hãy dùng WebM, WAV, MP3, OGG hoặc M4A.');
    }
    return this.shadowingService.submit(req.user.id ?? req.user.sub, sentenceId, file);
  }

  @Get('history')
  @ApiOperation({ summary: 'Lịch sử kết quả chấm phát âm AI của học viên' })
  history(@Req() req: any) {
    return this.shadowingService.getHistory(req.user.id ?? req.user.sub);
  }

  @Get('status/:attemptId')
  @ApiOperation({ summary: 'Lấy trạng thái và kết quả một lượt chấm Shadowing' })
  status(@Req() req: any, @Param('attemptId', new ParseUUIDPipe()) attemptId: string) {
    return this.shadowingService.getStatus(req.user.id ?? req.user.sub, attemptId);
  }

  @Post(':attemptId/discard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đánh dấu lượt Shadowing cũ đã bỏ khi học viên luyện lại' })
  discard(@Req() req: any, @Param('attemptId', new ParseUUIDPipe()) attemptId: string) {
    return this.shadowingService.discard(req.user.id ?? req.user.sub, attemptId);
  }
}

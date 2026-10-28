import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LessonService } from './lesson.service';
import { Lesson, LessonLevel, LessonStatus, UserRole } from '../database/entities';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateSentenceDto, UpdateSentenceDto } from './dto/create-sentence.dto';

@ApiTags('admin/lessons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/lessons')
export class AdminLessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Get()
  @ApiOperation({ summary: 'Admin lấy danh sách toàn bộ bài học (hỗ trợ lọc & tìm kiếm)' })
  @ApiQuery({ name: 'level', required: false, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] })
  @ApiQuery({ name: 'isPremiumOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Tìm theo tiêu đề bài học' })
  @ApiResponse({ status: 200, description: 'Danh sách bài học kèm số lượng câu' })
  async getLessons(
    @Query('level') level?: LessonLevel,
    @Query('status') status?: LessonStatus,
    @Query('isPremiumOnly') isPremiumOnlyStr?: string,
    @Query('q') q?: string,
  ) {
    const isPremiumOnly =
      isPremiumOnlyStr === 'true' ? true : isPremiumOnlyStr === 'false' ? false : undefined;
    return this.lessonService.findAllAdmin({ level, status, isPremiumOnly, q });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin xem chi tiết bài học và toàn bộ danh sách câu transcript' })
  @ApiResponse({ status: 200, description: 'Chi tiết bài học' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  async getLessonDetail(@Param('id', ParseUUIDPipe) id: string): Promise<Lesson> {
    return this.lessonService.findByIdWithSentences(id);
  }

  @Post()
  @ApiOperation({ summary: 'Admin tạo bài học mới (có thể đính kèm câu ngay)' })
  @ApiResponse({ status: 201, description: 'Tạo bài học thành công' })
  async createLesson(@Req() req: any, @Body() dto: CreateLessonDto): Promise<Lesson> {
    const adminUserId = req.user?.id || req.user?.sub;
    return this.lessonService.createLesson(dto, adminUserId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Admin cập nhật thông tin bài học (tiêu đề, trạng thái DRAFT/PUBLISHED, cờ Premium, ...)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  async updateLesson(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLessonDto,
  ): Promise<Lesson> {
    return this.lessonService.updateLesson(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin xóa bài học (tự động xóa toàn bộ câu liên quan)' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài học' })
  async deleteLesson(@Param('id', ParseUUIDPipe) id: string) {
    return this.lessonService.deleteLesson(id);
  }

  @Post(':id/sentences')
  @ApiOperation({ summary: 'Admin thêm một câu mới vào bài học' })
  @ApiResponse({ status: 201, description: 'Thêm câu thành công' })
  async addSentence(
    @Param('id', ParseUUIDPipe) lessonId: string,
    @Body() dto: CreateSentenceDto,
  ) {
    return this.lessonService.addSentence(lessonId, dto);
  }

  @Put(':id/sentences/bulk')
  @ApiOperation({ summary: 'Admin ghi đè toàn bộ danh sách câu cho bài học (Bulk replace)' })
  @ApiResponse({ status: 200, description: 'Cập nhật danh sách câu thành công' })
  async bulkSetSentences(
    @Param('id', ParseUUIDPipe) lessonId: string,
    @Body() sentences: CreateSentenceDto[],
  ) {
    return this.lessonService.bulkSetSentences(lessonId, sentences);
  }

  @Put(':id/sentences/:sentenceId')
  @ApiOperation({ summary: 'Admin cập nhật một câu cụ thể trong bài học' })
  @ApiResponse({ status: 200, description: 'Cập nhật câu thành công' })
  async updateSentence(
    @Param('id', ParseUUIDPipe) lessonId: string,
    @Param('sentenceId', ParseUUIDPipe) sentenceId: string,
    @Body() dto: UpdateSentenceDto,
  ) {
    return this.lessonService.updateSentence(lessonId, sentenceId, dto);
  }

  @Delete(':id/sentences/:sentenceId')
  @ApiOperation({ summary: 'Admin xóa một câu khỏi bài học' })
  @ApiResponse({ status: 200, description: 'Xóa câu thành công' })
  async deleteSentence(
    @Param('id', ParseUUIDPipe) lessonId: string,
    @Param('sentenceId', ParseUUIDPipe) sentenceId: string,
  ) {
    return this.lessonService.deleteSentence(lessonId, sentenceId);
  }

  @Post('auto-transcribe-preview')
  @ApiOperation({ summary: 'Admin xem trước phụ đề tự động bằng AI (AI Auto-Transcription Preview)' })
  @ApiResponse({ status: 200, description: 'Kết quả trích xuất phụ đề AI' })
  async autoTranscribePreview(
    @Body() body: { mediaUrl?: string; captionsVtt?: string },
  ) {
    return this.lessonService.autoTranscribe(body.mediaUrl, body.captionsVtt);
  }

  @Post(':id/auto-transcribe')
  @ApiOperation({ summary: 'Admin tự động trích xuất phụ đề AI và cập nhật vào bài học' })
  @ApiResponse({ status: 200, description: 'Trích xuất và lưu câu thoại thành công' })
  async autoTranscribeLesson(
    @Param('id', ParseUUIDPipe) lessonId: string,
    @Body() body: { mediaUrl?: string; captionsVtt?: string },
  ) {
    return this.lessonService.autoTranscribeAndSave(lessonId, body.mediaUrl, body.captionsVtt);
  }

  @Post('auto-transcribe-audio-file')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Admin tải lên file audio (.mp3, .wav) để AI Whisper trích xuất câu và mốc thời gian' })
  async autoTranscribeAudioFile(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn tệp âm thanh (.mp3, .wav, .m4a).');
    return this.lessonService.autoTranscribeFromBuffer(file.buffer, file.originalname);
  }

  @Post(':id/auto-transcribe-audio-file')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Admin tải lên file audio để AI trích xuất và lưu trực tiếp vào bài học' })
  async autoTranscribeAndSaveAudioFile(
    @Param('id', ParseUUIDPipe) lessonId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn tệp âm thanh (.mp3, .wav, .m4a).');
    return this.lessonService.autoTranscribeAndSaveFromBuffer(lessonId, file.buffer, file.originalname);
  }
}


import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateCustomDictationInput, DictationAnswer, DictationService } from './dictation.service';

@ApiTags('Dictation')
@Controller()
export class DictationController {
  constructor(private readonly dictationService: DictationService) {}

  @Get('practice/dictation/history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  history(@Req() req: any) {
    return this.dictationService.getHistory(req.user.id ?? req.user.sub);
  }

  @Get('practice/dictation/lessons')
  @UseGuards(OptionalJwtAuthGuard)
  listLessons(@Req() req: any, @Query('level') level?: string, @Query('mediaType') mediaType?: string, @Query('q') q?: string) {
    return this.dictationService.listLessons(req.user?.id ?? req.user?.sub, { level, mediaType, q });
  }

  @Post('practice/dictation/custom')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createCustomLesson(@Req() req: any, @Body() body: CreateCustomDictationInput | null) {
    return this.dictationService.createCustomLesson(req.user.id ?? req.user.sub, body ?? {});
  }

  @Get('lessons/:lessonId/sentences')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getSentences(@Req() req: any, @Param('lessonId', new ParseUUIDPipe()) lessonId: string) {
    return this.dictationService.getLessonSentences(req.user.id ?? req.user.sub, lessonId);
  }

  @Post('practice/dictation/submit')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  submit(@Req() req: any, @Body() body: { lessonId: string; answers: DictationAnswer[] } | null) {
    return this.dictationService.submit(req.user.id ?? req.user.sub, body?.lessonId ?? '', body?.answers);
  }
}

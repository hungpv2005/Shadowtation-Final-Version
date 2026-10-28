import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../practice/dictation/jwt-auth.guard';
import { LearningService } from './learning.service';

@ApiTags('Learning progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('progress')
  getProgress(@Req() req: any, @Query('period') period?: string) {
    return this.learningService.getProgress(req.user.id ?? req.user.sub, period);
  }

  @Get('streak-logs')
  getStreakLogs(@Req() req: any, @Query('days') days?: string) {
    return this.learningService.getStreakLogs(req.user.id ?? req.user.sub, days);
  }

  @Get('review-list')
  getReviewList(@Req() req: any, @Query('source') source?: string, @Query('q') q?: string) {
    return this.learningService.getReviewList(req.user.id ?? req.user.sub, source, q);
  }

  @Post('review-list/:id/answer')
  answerReviewWord(@Req() req: any, @Param('id') id: string, @Body() body: { answer?: unknown } | null) {
    return this.learningService.answerReviewWord(req.user.id ?? req.user.sub, id, body?.answer);
  }

  @Delete('review-list/:id')
  deleteReviewWord(@Req() req: any, @Param('id') id: string) {
    return this.learningService.deleteReviewWord(req.user.id ?? req.user.sub, id);
  }

  @Delete('review-list')
  clearReviewList(@Req() req: any) {
    return this.learningService.clearReviewList(req.user.id ?? req.user.sub);
  }
}


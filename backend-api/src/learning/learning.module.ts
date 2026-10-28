import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../practice/dictation/jwt-auth.guard';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';

@Module({ controllers: [LearningController], providers: [LearningService, JwtAuthGuard] })
export class LearningModule {}

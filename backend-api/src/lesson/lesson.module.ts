import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from '../database/entities/lesson.entity';
import { LessonSentence } from '../database/entities/lesson-sentence.entity';
import { LessonService } from './lesson.service';
import { AdminLessonController } from './admin-lesson.controller';
import { SpeechModule } from '../speech/speech.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lesson, LessonSentence]),
    SpeechModule,
  ],
  controllers: [AdminLessonController],
  providers: [LessonService],
  exports: [LessonService],
})
export class LessonModule {}

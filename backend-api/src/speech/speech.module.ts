import { Module } from '@nestjs/common';
import { SpeechService } from './speech.service';
import { SpeechController } from './speech.controller';
import { JwtAuthGuard } from '../practice/dictation/jwt-auth.guard';

@Module({
  controllers: [SpeechController],
  providers: [SpeechService, JwtAuthGuard],
  exports: [SpeechService],
})
export class SpeechModule {}

import { Module } from '@nestjs/common';
import { SpeechModule } from '../../speech/speech.module';
import { JwtAuthGuard } from '../dictation/jwt-auth.guard';
import { ShadowingController } from './shadowing.controller';
import { ShadowingService } from './shadowing.service';

@Module({ imports: [SpeechModule], controllers: [ShadowingController], providers: [ShadowingService, JwtAuthGuard] })
export class ShadowingModule {}

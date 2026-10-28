import { Module } from '@nestjs/common';
import { DictationController } from './dictation.controller';
import { DictationService } from './dictation.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DictationController],
  providers: [DictationService],
})
export class DictationModule {}

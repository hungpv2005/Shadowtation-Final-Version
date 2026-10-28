import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfig } from '../database/entities/system-config.entity';
import { SystemConfigService } from './system-config.service';
import { AdminSystemConfigController } from './admin-system-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig])],
  controllers: [AdminSystemConfigController],
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}

import { Module } from '@nestjs/common';
import { SchoolSettingsController } from './school-settings.controller';
import { SchoolSettingsService } from './school-settings.service';
import { SchoolSettingsRepository } from './school-settings.repository';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [SchoolSettingsController],
  providers: [SchoolSettingsService, SchoolSettingsRepository],
  exports: [SchoolSettingsService],
})
export class SchoolSettingsModule {}

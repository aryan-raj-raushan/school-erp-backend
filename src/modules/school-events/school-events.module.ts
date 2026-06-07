import { Module } from '@nestjs/common';
import { SchoolEventsController } from './school-events.controller';
import { SchoolEventsService } from './school-events.service';
import { SchoolEventsRepository } from './school-events.repository';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [SchoolEventsController],
  providers: [SchoolEventsService, SchoolEventsRepository],
  exports: [SchoolEventsService],
})
export class SchoolEventsModule {}
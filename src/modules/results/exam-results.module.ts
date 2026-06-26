import { Module } from '@nestjs/common';
import { ExamResultsController, ReportCardsController } from './exam-results.controller';
import { ExamResultsService } from './exam-results.service';
import { ExamResultsRepository } from './exam-results.repository';
import { DrizzleModule } from '../../database/drizzle/drizzle.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [DrizzleModule, RedisModule],
  controllers: [ExamResultsController, ReportCardsController],
  providers: [ExamResultsService, ExamResultsRepository],
  exports: [ExamResultsService],
})
export class ExamResultsModule {}

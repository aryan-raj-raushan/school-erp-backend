import { Module } from '@nestjs/common';
import { ExamResultsController, ReportCardsController } from './exam-results.controller';
import { ExamResultsService } from './exam-results.service';
import { ExamResultsRepository } from './exam-results.repository';
import { DrizzleModule } from '../../database/drizzle/drizzle.module';
import { RedisModule } from '../redis/redis.module';
import { ExamModule } from '@modules/exam/exam.module';
import { ExamAttendanceResultSyncListener } from './events/exam-attendance-result-sync.listener';

@Module({
  imports: [DrizzleModule, RedisModule, ExamModule],
  controllers: [ExamResultsController, ReportCardsController],
  providers: [ExamResultsService, ExamResultsRepository, ExamAttendanceResultSyncListener],
  exports: [ExamResultsService],
})
export class ExamResultsModule {}

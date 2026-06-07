import { Module } from '@nestjs/common';
import { TimetableSessionsController } from './timetable-sessions.controller';
import { TimetableSessionsService } from './timetable-sessions.service';
import { TimetableSessionsRepository } from './timetable-sessions.repository';

@Module({
  controllers: [TimetableSessionsController],
  providers: [TimetableSessionsService, TimetableSessionsRepository],
  exports: [TimetableSessionsService, TimetableSessionsRepository],
})
export class TimetableSessionsModule {}

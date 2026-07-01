import { Module } from '@nestjs/common';
import { TimetableController } from './timetable.controller';
import { TimetableService } from './timetable.service';
import { TimetableRepository } from './timetable.repository';
import { DrizzleModule } from '../../database/drizzle/drizzle.module';
import { SchoolSettingsModule } from '../school-settings/school-settings.module';
import { ClassSubjectTeacherModule } from '../class-subject-teacher/class-subject-teacher.module';

@Module({
  imports: [DrizzleModule, SchoolSettingsModule, ClassSubjectTeacherModule],
  controllers: [TimetableController],
  providers: [TimetableService, TimetableRepository],
  exports: [TimetableService],
})
export class TimetableModule {}

import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle/drizzle.module';
import { RedisModule } from '../redis/redis.module';
import { ClassSubjectTeacherModule } from '../class-subject-teacher/class-subject-teacher.module';
import { HolidaysModule } from '../holidays/holidays.module';
import { SchoolSettingsModule } from '../school-settings/school-settings.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

// Grading
import { ExamGradingController } from './exam-setup/exam-grading.controller';
import { ExamGradingService } from './exam-setup/exam-grading.service';
import { ExamGradingRepository } from './exam-setup/exam-grading.repository';

// Exams
import { ExamController } from './exam-manage/exam.controller';
import { ExamService } from './exam-manage/exam.service';
import { ExamRepository } from './exam-manage/exam.repository';

// Schedule
import { ExamScheduleController } from './exam-schedule/exam-schedule.controller';
import { ExamScheduleService } from './exam-schedule/exam-schedule.service';
import { ExamScheduleRepository } from './exam-schedule/exam-schedule.repository';

// Attendance
import { ExamAttendanceController } from './exam-attendance/exam-attendance.controller';
import { ExamAttendanceService } from './exam-attendance/exam-attendance.service';
import { ExamAttendanceRepository } from './exam-attendance/exam-attendance.repository';

// Hall
import { ExamHallDetailController } from './exam-hall/exam-hall.controller';
import { ExamHallService } from './exam-hall/exam-hall.service';
import { ExamHallRepository } from './exam-hall/exam-hall.repository';

// Sitting
import { ExamSittingController } from './exam-sitting/exam-sitting.controller';
import { ExamSittingService } from './exam-sitting/exam-sitting.service';
import { ExamSittingRepository } from './exam-sitting/exam-sitting.repository';

// PDF Generators
import { ExamAttendanceCardService } from './exam-attendance/exam-attendance-card.service';
import { ExamAttendanceCardController } from './exam-attendance/exam-attendance-card.controller';
import { ExamAdmitCardService } from './exam-admit-card/exam-admit-card.service';
import { ExamAdmitCardController } from './exam-admit-card/exam-admit-card.controller';
import { ExamAttendanceCardRepository } from './exam-attendance/exam-attendance-card.repository';
import { ExamAdmitCardRepository } from './exam-admit-card/exam-admit-card.repository';

// Templates
import { ExamTemplateController } from './exam-templates/exam-template.controller';
import { ExamTemplateService } from './exam-templates/exam-template.service';
import { ExamTemplateRepository } from './exam-templates/exam-template.repository';

// Event listeners (cross-module cascades — see src/modules/events/events.module.ts)
import { ExamCascadeListener } from './events/exam-cascade.listener';
import { ScheduleHallSyncListener } from './events/schedule-hall-sync.listener';

@Module({
  imports: [
    DrizzleModule,
    RedisModule,
    ClassSubjectTeacherModule,
    HolidaysModule,
    SchoolSettingsModule,
    AuditLogsModule,
  ],
  controllers: [
    ExamGradingController,
    ExamController,
    ExamScheduleController,
    ExamAttendanceController,
    ExamAttendanceCardController,
    ExamHallDetailController,
    ExamSittingController,
    ExamAdmitCardController,
    ExamTemplateController,
  ],
  providers: [
    // Grading
    ExamGradingService,
    ExamGradingRepository,
    // Exam
    ExamService,
    ExamRepository,
    // Schedule
    ExamScheduleService,
    ExamScheduleRepository,
    // Attendance
    ExamAttendanceService,
    ExamAttendanceRepository,
    ExamAttendanceCardService,
    ExamAttendanceCardRepository,
    // Hall
    ExamHallService,
    ExamHallRepository,
    // Sitting
    ExamSittingService,
    ExamSittingRepository,
    // Admit card
    ExamAdmitCardService,
    ExamAdmitCardRepository,
    // Templates
    ExamTemplateService,
    ExamTemplateRepository,
    // Event listeners
    ExamCascadeListener,
    ScheduleHallSyncListener,
  ],
  exports: [ExamService, ExamScheduleService, ExamHallService, ExamScheduleRepository],
})
export class ExamModule {}

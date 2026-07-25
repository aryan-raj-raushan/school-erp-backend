import { Module } from '@nestjs/common';
import {
  ParentPortalAttendanceController,
  ParentPortalFeesController,
  ParentPortalHomeworkController,
  ParentPortalTimetableController,
  ParentPortalExamsController,
  ParentPortalResultsController,
  ParentPortalGatePassesController,
  ParentPortalMovementsController,
  ParentPortalProfileController,
} from './parent-portal.controller';
import { ParentPortalService } from './parent-portal.service';
import { StudentsModule } from '../students/students.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { FeesModule } from '../fees/fees.module';
import { AcademicsModule } from '../academics/academics.module';
import { ExamModule } from '../exam/exam.module';
import { ExamResultsModule } from '../results/exam-results.module';
import { TimetableModule } from '../timetable/timetable.module';
import { GatePassesModule } from '../gate-passes/gate-passes.module';
import { StudentMovementsModule } from '../student-movements/student-movements.module';

// Composes existing per-module services with student-scoping only — no duplicated
// business logic. See atomic-hatching-whisper.md "Backend implementation" for the
// per-resource mapping this module is built against.
@Module({
  imports: [
    StudentsModule,
    AttendanceModule,
    FeesModule,
    AcademicsModule,
    ExamModule,
    ExamResultsModule,
    TimetableModule,
    GatePassesModule,
    StudentMovementsModule,
  ],
  controllers: [
    ParentPortalAttendanceController,
    ParentPortalFeesController,
    ParentPortalHomeworkController,
    ParentPortalTimetableController,
    ParentPortalExamsController,
    ParentPortalResultsController,
    ParentPortalGatePassesController,
    ParentPortalMovementsController,
    ParentPortalProfileController,
  ],
  providers: [ParentPortalService],
})
export class ParentPortalModule {}

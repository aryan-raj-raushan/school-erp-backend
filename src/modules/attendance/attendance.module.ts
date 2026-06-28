import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceEngineService } from './attendance-engine.service';
import { SchoolSettingsModule } from '../school-settings/school-settings.module';
import { StaffShiftsModule } from '../staff-shifts/staff-shifts.module';

@Module({
  imports: [SchoolSettingsModule, StaffShiftsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository, AttendanceEngineService],
  exports: [AttendanceService, AttendanceRepository, AttendanceEngineService],
})
export class AttendanceModule {}

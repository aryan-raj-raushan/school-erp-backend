import { Module } from '@nestjs/common';
import { DashboardController, ReportsController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './dashboard.repository';
import { StudentsModule } from '../students/students.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { FeesModule } from '../fees/fees.module';

@Module({
  imports: [StudentsModule, AttendanceModule, FeesModule],
  controllers: [DashboardController, ReportsController],
  providers: [DashboardService, DashboardRepository],
  exports: [DashboardService],
})
export class DashboardModule {}

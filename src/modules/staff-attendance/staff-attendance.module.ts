import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle/drizzle.module';
import { RedisModule } from '../redis/redis.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { StaffAttendanceController } from './staff-attendance.controller';
import { StaffAttendanceService } from './staff-attendance.service';
import { StaffAttendanceRepository } from './staff-attendance.repository';

@Module({
  imports: [DrizzleModule, RedisModule, AttendanceModule],
  controllers: [StaffAttendanceController],
  providers: [StaffAttendanceService, StaffAttendanceRepository],
  exports: [StaffAttendanceService],
})
export class StaffAttendanceModule {}

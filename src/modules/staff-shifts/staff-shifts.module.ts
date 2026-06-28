import { Module } from '@nestjs/common';
import { StaffShiftsController } from './staff-shifts.controller';
import { StaffShiftsService } from './staff-shifts.service';
import { StaffShiftsRepository } from './staff-shifts.repository';

@Module({
  controllers: [StaffShiftsController],
  providers: [StaffShiftsService, StaffShiftsRepository],
  exports: [StaffShiftsService],
})
export class StaffShiftsModule {}

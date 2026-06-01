import { Module } from '@nestjs/common';
import { LeavePoliciesController, TeacherLeaveController, StudentLeaveController, ParentLeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { LeaveRepository } from './leave.repository';

@Module({
  controllers: [LeavePoliciesController, TeacherLeaveController, StudentLeaveController, ParentLeaveController],
  providers: [LeaveService, LeaveRepository],
  exports: [LeaveService, LeaveRepository],
})
export class LeaveModule {}

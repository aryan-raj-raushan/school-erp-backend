import { Module } from '@nestjs/common';
import { LeavePoliciesController, TeacherLeaveController, StudentLeaveController, ParentLeaveController, LeaveWorkflowController } from './leave.controller';
import { LeaveService } from './leave.service';
import { LeaveRepository } from './leave.repository';
import { DrizzleModule } from '../../database/drizzle/drizzle.module';

@Module({
  imports: [DrizzleModule],
  controllers: [LeavePoliciesController, TeacherLeaveController, StudentLeaveController, ParentLeaveController, LeaveWorkflowController],
  providers: [LeaveService, LeaveRepository],
  exports: [LeaveService, LeaveRepository],
})
export class LeaveModule {}

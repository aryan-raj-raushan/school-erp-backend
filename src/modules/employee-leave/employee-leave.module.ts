import { Module } from '@nestjs/common';
import { EmployeeLeaveRepository } from './employee-leave.repository';
import { EmployeeLeaveService } from './employee-leave.service';
import {
  LeaveTypesController,
  LeaveAssignedController,
  LeaveApplicationsController,
} from './employee-leave.controller';
import { RedisModule } from '../redis/redis.module';
import { DrizzleModule } from '../../database/drizzle/drizzle.module';

@Module({
  imports: [RedisModule, DrizzleModule],
  controllers: [LeaveTypesController, LeaveAssignedController, LeaveApplicationsController],
  providers: [EmployeeLeaveService, EmployeeLeaveRepository],
  exports: [EmployeeLeaveService],
})
export class EmployeeLeaveModule {}

import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { InviteController } from './invite.controller';
import { StaffService } from './staff.service';
import { StaffRepository } from './staff.repository';

@Module({
  controllers: [StaffController, InviteController],
  providers: [StaffService, StaffRepository],
  exports: [StaffService, StaffRepository],
})
export class StaffModule {}

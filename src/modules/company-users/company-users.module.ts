import { Module } from '@nestjs/common';
import { CompanyUsersController } from './company-users.controller';
import { CompanyUsersService } from './company-users.service';
import { CompanyUsersRepository } from './company-users.repository';
import { AuthRepository } from '../auth/auth.repository';

@Module({
  controllers: [CompanyUsersController],
  providers: [CompanyUsersService, CompanyUsersRepository, AuthRepository],
  exports: [CompanyUsersService],
})
export class CompanyUsersModule {}

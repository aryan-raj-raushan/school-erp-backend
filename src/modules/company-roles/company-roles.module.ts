import { Global, Module } from '@nestjs/common';
import { CompanyRolesController } from './company-roles.controller';
import { CompanyRolesService } from './company-roles.service';
import { CompanyRolesRepository } from './company-roles.repository';
import { CompanyAccessService } from './company-access.service';

@Global()
@Module({
  controllers: [CompanyRolesController],
  providers: [CompanyRolesService, CompanyRolesRepository, CompanyAccessService],
  exports: [CompanyAccessService, CompanyRolesService],
})
export class CompanyRolesModule {}

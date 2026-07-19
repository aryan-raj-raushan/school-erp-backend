import { Module } from '@nestjs/common';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';
import { SchoolsRepository } from './schools.repository';
import { AuthRepository } from '../auth/auth.repository';
import { RolesModule } from '../roles/roles.module';
import { SchoolCreatedListener } from './events/school-created.listener';

@Module({
  imports: [RolesModule],
  controllers: [SchoolsController],
  providers: [SchoolsService, SchoolsRepository, AuthRepository, SchoolCreatedListener],
  exports: [SchoolsService, SchoolsRepository],
})
export class SchoolsModule {}

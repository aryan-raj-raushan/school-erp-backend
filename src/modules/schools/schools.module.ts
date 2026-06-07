import { Module } from '@nestjs/common';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';
import { SchoolsRepository } from './schools.repository';
import { AuthRepository } from '../auth/auth.repository';

@Module({
  controllers: [SchoolsController],
  providers: [SchoolsService, SchoolsRepository, AuthRepository],
  exports: [SchoolsService, SchoolsRepository],
})
export class SchoolsModule {}

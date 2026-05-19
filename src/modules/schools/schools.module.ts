import { Module } from '@nestjs/common';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';
import { SchoolsRepository } from './schools.repository';

@Module({
  controllers: [SchoolsController],
  providers: [SchoolsService, SchoolsRepository],
  exports: [SchoolsService, SchoolsRepository],
})
export class SchoolsModule {}

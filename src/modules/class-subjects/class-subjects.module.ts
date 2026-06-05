import { Module } from '@nestjs/common';
import { ClassSubjectsController } from './class-subjects.controller';
import { ClassSubjectsService } from './class-subjects.service';
import { ClassSubjectsRepository } from './class-subjects.repository';

@Module({
  controllers: [ClassSubjectsController],
  providers: [ClassSubjectsService, ClassSubjectsRepository],
  exports: [ClassSubjectsService],
})
export class ClassSubjectsModule {}

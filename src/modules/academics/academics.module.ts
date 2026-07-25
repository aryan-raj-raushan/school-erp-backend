import { Module } from '@nestjs/common';
import { HomeworkController, StudyMaterialsController, ParentHomeworkController } from './academics.controller';
import { AcademicsService } from './academics.service';
import { AcademicsRepository } from './academics.repository';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [StudentsModule],
  controllers: [HomeworkController, StudyMaterialsController, ParentHomeworkController],
  providers: [AcademicsService, AcademicsRepository],
  exports: [AcademicsService, AcademicsRepository],
})
export class AcademicsModule {}

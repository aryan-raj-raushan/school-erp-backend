import { Module } from '@nestjs/common';
import { AcademicYearsController } from './academic-years.controller';
import { AcademicYearsService } from './academic-years.service';
import { AcademicYearsRepository } from './academic-years.repository';

@Module({
  controllers: [AcademicYearsController],
  providers: [AcademicYearsService, AcademicYearsRepository],
  exports: [AcademicYearsService, AcademicYearsRepository],
})
export class AcademicYearsModule {}

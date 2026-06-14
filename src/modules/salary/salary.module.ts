import { Module } from '@nestjs/common';
import { SalaryController } from './salary.controller';
import { SalaryService } from './salary.service';
import { SalaryRepository } from './salary.repository';

@Module({
  controllers: [SalaryController],
  providers: [SalaryService, SalaryRepository],
  exports: [SalaryService, SalaryRepository],
})
export class SalaryModule {}

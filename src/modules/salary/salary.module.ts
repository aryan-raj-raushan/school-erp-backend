import { Module } from '@nestjs/common';
import { SalaryController } from './salary.controller';
import { SalaryService } from './salary.service';
import { SalaryRepository } from './salary.repository';
import { FinanceExpensePostedListener } from './events/finance-expense-posted.listener';

@Module({
  controllers: [SalaryController],
  providers: [SalaryService, SalaryRepository, FinanceExpensePostedListener],
  exports: [SalaryService, SalaryRepository],
})
export class SalaryModule {}

import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { FinanceRepository } from './finance.repository';
import { SalaryTransactionProcessedListener } from './events/salary-transaction-processed.listener';
import { SalaryTransactionVoidedListener } from './events/salary-transaction-voided.listener';

@Module({
  controllers: [FinanceController],
  providers: [
    FinanceService,
    FinanceRepository,
    SalaryTransactionProcessedListener,
    SalaryTransactionVoidedListener,
  ],
  exports: [FinanceService, FinanceRepository],
})
export class FinanceModule {}

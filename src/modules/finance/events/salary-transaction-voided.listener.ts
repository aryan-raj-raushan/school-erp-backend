import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FinanceService } from '../finance.service';
import { APP_EVENTS } from '../../../shared/events/event-names';
import { SalaryTransactionVoidedEvent } from '../../salary/events/salary.events';

@Injectable()
export class SalaryTransactionVoidedListener {
  private readonly logger = new Logger(SalaryTransactionVoidedListener.name);

  constructor(private readonly financeService: FinanceService) {}

  @OnEvent(APP_EVENTS.SALARY.TRANSACTION_VOIDED)
  async handleTransactionVoided(payload: SalaryTransactionVoidedEvent): Promise<void> {
    try {
      await this.financeService.removeExpense(payload.financeExpenseId, payload.schoolId);
    } catch (error) {
      this.logger.error(
        `Failed to reverse finance expense ${payload.financeExpenseId} for voided salary transaction ${payload.transactionId}`,
        error,
      );
    }
  }
}

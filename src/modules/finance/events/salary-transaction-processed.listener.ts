import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { FinanceService } from '../finance.service';
import { APP_EVENTS } from '../../../shared/events/event-names';
import { SalaryTransactionProcessedEvent } from '../../salary/events/salary.events';
import { SalaryExpensePostedEvent } from './finance.events';

@Injectable()
export class SalaryTransactionProcessedListener {
  private readonly logger = new Logger(SalaryTransactionProcessedListener.name);

  constructor(
    private readonly financeService: FinanceService,
    private readonly events: EventEmitter2,
  ) {}

  // Posting salary as a Finance expense is a side effect of payroll processing
  // — kept out of the salary module entirely so it stays unaware of Finance.
  @OnEvent(APP_EVENTS.SALARY.TRANSACTION_PROCESSED)
  async handleTransactionProcessed(payload: SalaryTransactionProcessedEvent): Promise<void> {
    try {
      const expense = await this.financeService.createExpense(
        {
          expense_head_id: payload.expenseHeadId,
          from_account_id: payload.fromAccountId,
          total_amount: Number(payload.netAmount),
          date_of_expense: payload.dateOfExpense,
          employee_id: payload.employeeId,
          remarks: payload.remarks || `Salary payout — transaction ${payload.transactionId}`,
        },
        payload.schoolId,
        payload.createdBy ?? 'system',
      );

      await this.events.emitAsync(APP_EVENTS.FINANCE.SALARY_EXPENSE_POSTED, {
        transactionId: payload.transactionId,
        schoolId: payload.schoolId,
        financeExpenseId: expense.id,
      } satisfies SalaryExpensePostedEvent);
    } catch (error) {
      this.logger.error(
        `Failed to post Finance expense for salary transaction ${payload.transactionId}`,
        error,
      );
    }
  }
}

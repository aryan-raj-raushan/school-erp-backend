import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SalaryRepository } from '../salary.repository';
import { RedisService } from '../../redis/redis.service';
import { APP_EVENTS } from '../../../shared/events/event-names';
import { SalaryExpensePostedEvent } from '../../finance/events/finance.events';

@Injectable()
export class FinanceExpensePostedListener {
  private readonly logger = new Logger(FinanceExpensePostedListener.name);

  constructor(
    private readonly salaryRepo: SalaryRepository,
    private readonly redisService: RedisService,
  ) {}

  @OnEvent(APP_EVENTS.FINANCE.SALARY_EXPENSE_POSTED)
  async handleExpensePosted(payload: SalaryExpensePostedEvent): Promise<void> {
    try {
      await this.salaryRepo.linkFinanceExpense(
        payload.transactionId,
        payload.schoolId,
        payload.financeExpenseId,
      );
      await this.redisService.delByPattern(`salary:transactions:${payload.schoolId}:*`);
    } catch (error) {
      this.logger.error(
        `Failed to link finance expense ${payload.financeExpenseId} to salary transaction ${payload.transactionId}`,
        error,
      );
    }
  }
}

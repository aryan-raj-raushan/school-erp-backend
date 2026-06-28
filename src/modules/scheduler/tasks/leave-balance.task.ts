import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DRIZZLE_ORM } from '../../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../../database/drizzle/drizzle.provider';
import { leaveBalances } from '../../../database/drizzle/schema/leave.schema';
import { academicYears } from '../../../database/drizzle/schema/academic-years.schema';
import { eq, and, lte, isNotNull, lt } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

@Injectable()
export class LeaveBalanceTask {
  private readonly logger = new Logger(LeaveBalanceTask.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // Run at midnight on the 1st of every month
  @Cron('0 0 1 * *')
  async expireLeaveBalances() {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.db
      .update(leaveBalances)
      .set({ carried_forward: 0, allocated: sql`${leaveBalances.allocated}` })
      .where(and(isNotNull(leaveBalances.expires_at), lte(leaveBalances.expires_at, today)));
    this.logger.log(`Leave balance expiry run: processed entries`);
  }
}

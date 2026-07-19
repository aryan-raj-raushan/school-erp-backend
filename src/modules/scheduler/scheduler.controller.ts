import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionExpiryTask } from './tasks/subscription-expiry.task';
import { InvoiceGenerationTask } from './tasks/invoice-generation.task';
import { RestrictionEnforcementTask } from './tasks/restriction-enforcement.task';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { CompanyRole } from '../../shared/enums';

// SUPER_ADMIN-only manual triggers for the billing cron jobs — lets ops/QA
// run a job on demand instead of waiting for its scheduled time, e.g. to
// verify restriction enforcement without waiting until 3 AM.
@ApiTags('Scheduler')
@ApiBearerAuth('access-token')
@Controller('scheduler')
export class SchedulerController {
  constructor(
    private readonly subscriptionExpiryTask: SubscriptionExpiryTask,
    private readonly invoiceGenerationTask: InvoiceGenerationTask,
    private readonly restrictionEnforcementTask: RestrictionEnforcementTask,
  ) {}

  @Post('run/subscription-expiry')
  @Roles(CompanyRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually run the subscription expiry/auto-renew job now' })
  async runSubscriptionExpiry() {
    await this.subscriptionExpiryTask.handleSubscriptionExpiry();
    return ApiResponse.success(null, 'Subscription expiry job run');
  }

  @Post('run/invoice-recurring')
  @Roles(CompanyRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually run recurring invoice generation now' })
  async runRecurringInvoices() {
    await this.invoiceGenerationTask.handleRecurringInvoices();
    return ApiResponse.success(null, 'Recurring invoice generation job run');
  }

  @Post('run/invoice-overdue')
  @Roles(CompanyRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually run overdue-invoice marking now' })
  async runOverdueInvoices() {
    await this.invoiceGenerationTask.handleOverdueInvoices();
    return ApiResponse.success(null, 'Overdue invoice job run');
  }

  @Post('run/restriction-enforcement')
  @Roles(CompanyRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually run school-restriction enforcement now' })
  async runRestrictionEnforcement() {
    await this.restrictionEnforcementTask.handleRestrictionEnforcement();
    return ApiResponse.success(null, 'Restriction enforcement job run');
  }
}

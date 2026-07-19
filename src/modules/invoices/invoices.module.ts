import { Module } from '@nestjs/common';
import { InvoicesController, OneTimeChargesController } from './invoices.controller';
import { PaymentsController, PaymentsQueueController } from './payments.controller';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './invoices.repository';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { RazorpayService } from './razorpay.service';
import { SubscriptionAssignedListener } from './events/subscription-assigned.listener';
import { PaymentApprovedListener } from './events/payment-approved.listener';
import { InvoicePaidListener } from './events/invoice-paid.listener';
import { RfidDeviceAssignedListener } from './events/rfid-device-assigned.listener';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SchoolsModule } from '../schools/schools.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [SubscriptionsModule, SchoolsModule, UploadsModule],
  controllers: [
    InvoicesController,
    OneTimeChargesController,
    PaymentsController,
    PaymentsQueueController,
  ],
  providers: [
    InvoicesService,
    InvoicesRepository,
    PaymentsService,
    PaymentsRepository,
    RazorpayService,
    SubscriptionAssignedListener,
    PaymentApprovedListener,
    InvoicePaidListener,
    RfidDeviceAssignedListener,
  ],
  exports: [InvoicesService, InvoicesRepository],
})
export class InvoicesModule {}

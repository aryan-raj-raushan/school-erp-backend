import { Module } from '@nestjs/common';
import { FeesController } from './fees.controller';
import {
  FeesPaymentGatewayController,
  FeesPaymentGatewayWebhookController,
} from './fees-payment-gateway.controller';
import { FeesService } from './fees.service';
import { FeesRepository } from './fees.repository';
import { FeePaymentGatewayOrdersRepository } from './fee-payment-gateway-orders.repository';
import { FinanceModule } from '../finance/finance.module';
import { RazorpayService } from '../../shared/services/razorpay.service';

@Module({
  imports: [FinanceModule],
  controllers: [FeesController, FeesPaymentGatewayController, FeesPaymentGatewayWebhookController],
  providers: [FeesService, FeesRepository, FeePaymentGatewayOrdersRepository, RazorpayService],
  exports: [FeesService, FeesRepository],
})
export class FeesModule {}

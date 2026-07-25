import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { CreateRazorpayOrderDto } from './dto/fee-payment-gateway/create-razorpay-order.dto';
import { VerifyRazorpayPaymentDto } from './dto/fee-payment-gateway/verify-razorpay-payment.dto';
import { ParentAccessible } from '../../common/decorators/parent-accessible.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { GetCurrentStudentId } from '../../common/decorators/current-student-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';

@ApiTags('Parent Fee Payments (Razorpay)')
@ApiBearerAuth('access-token')
@Controller('parent-portal/fees/bills')
export class FeesPaymentGatewayController {
  constructor(private readonly feesService: FeesService) {}

  @Post(':billId/pay/razorpay-order')
  @ParentAccessible()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Parent: create a Razorpay order to pay a fee bill online' })
  async createRazorpayOrder(
    @Param('billId') billId: string,
    @Body() dto: CreateRazorpayOrderDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentStudentId() studentId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.feesService.createRazorpayOrder(
      schoolId,
      studentId,
      billId,
      userId,
      dto.amount,
    );
    return ApiResponse.created(data, 'Razorpay order created');
  }

  @Post(':billId/pay/razorpay-verify')
  @ParentAccessible()
  @ApiOperation({ summary: 'Parent: verify a completed Razorpay checkout and record the payment' })
  async verifyRazorpayPayment(
    @Param('billId') billId: string,
    @Body() dto: VerifyRazorpayPaymentDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentStudentId() studentId: string,
  ) {
    const data = await this.feesService.verifyAndRecordRazorpayPayment(
      schoolId,
      studentId,
      billId,
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
    );
    return ApiResponse.success(data, 'Payment verified and recorded');
  }
}

@ApiTags('Fee Payments (Razorpay webhook)')
@Controller('fees/payments/razorpay')
export class FeesPaymentGatewayWebhookController {
  constructor(private readonly feesService: FeesService) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook (payment.captured / payment.failed) — server-to-server' })
  async razorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    if (!req.rawBody) throw new BadRequestException('Missing request body');
    await this.feesService.handleRazorpayWebhook(req.rawBody.toString('utf8'), signature);
    return { success: true };
  }
}

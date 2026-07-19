import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InvoicesService } from './invoices.service';
import { SubmitPaymentDto } from './dto/submit-payment.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { BypassRestriction } from '../../common/decorators/bypass-restriction.decorator';
import { GetCurrentUser, GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { CompanyRole, AuthContext } from '../../shared/enums';
import { JwtPayload } from '../../shared/types/jwt-payload.types';

@ApiTags('Invoice Payments')
@ApiBearerAuth('access-token')
@Controller('invoices/:id/payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly invoicesService: InvoicesService,
  ) {}

  @Get()
  @BypassRestriction()
  @ApiOperation({ summary: 'List payments recorded against an invoice' })
  async findAll(@Param('id', ParseUUIDPipe) invoiceId: string, @GetCurrentUser() user: JwtPayload) {
    // Reuse the existing invoice access check (school-scoped or company-scoped) before exposing its payments.
    if (user.context === AuthContext.SCHOOL) {
      await this.invoicesService.findByIdForSchool(invoiceId, user.school_id!);
    } else {
      await this.invoicesService.findByIdForCompanyUser(invoiceId, user.sub, user.role as string);
    }
    const data = await this.paymentsService.findByInvoice(invoiceId);
    return ApiResponse.success(data);
  }

  @Post()
  @BypassRestriction()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a manual payment (Cash/Bank Transfer/QR/Cheque) for verification',
  })
  async submit(
    @Param('id', ParseUUIDPipe) invoiceId: string,
    @Body() dto: SubmitPaymentDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.paymentsService.submitPayment(invoiceId, schoolId, dto, userId);
    return ApiResponse.created(data, 'Payment submitted for verification');
  }

  @Post('razorpay/order')
  @BypassRestriction()
  @ApiOperation({ summary: 'Create a Razorpay order for the outstanding balance' })
  async createRazorpayOrder(
    @Param('id', ParseUUIDPipe) invoiceId: string,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.paymentsService.createRazorpayOrder(invoiceId, schoolId, userId);
    return ApiResponse.success(data, 'Razorpay order created');
  }

  @Post(':paymentId/approve')
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.OPERATOR, CompanyRole.SALES)
  @ApiOperation({ summary: 'Approve a manually-submitted payment' })
  async approve(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @GetCurrentUser() user: JwtPayload,
  ) {
    const data = await this.paymentsService.approvePayment(
      paymentId,
      user.sub,
      user.role as string,
    );
    return ApiResponse.success(data, 'Payment approved');
  }

  @Post(':paymentId/reject')
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.OPERATOR, CompanyRole.SALES)
  @ApiOperation({ summary: 'Reject a manually-submitted payment' })
  async reject(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: RejectPaymentDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    const data = await this.paymentsService.rejectPayment(
      paymentId,
      dto,
      user.sub,
      user.role as string,
    );
    return ApiResponse.success(data, 'Payment rejected');
  }
}

@ApiTags('Invoice Payments')
@ApiBearerAuth('access-token')
@Controller('payments')
export class PaymentsQueueController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('pending')
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.OPERATOR, CompanyRole.SALES)
  @ApiOperation({ summary: 'List manual payments awaiting verification (scoped like invoices)' })
  async findPending(@GetCurrentUser() user: JwtPayload) {
    const data = await this.paymentsService.findPendingVerification(user.sub, user.role as string);
    return ApiResponse.success(data);
  }

  @Public()
  @Post('razorpay/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook (payment.captured / payment.failed)' })
  async razorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    if (!req.rawBody) throw new BadRequestException('Missing request body');
    await this.paymentsService.handleRazorpayWebhook(req.rawBody.toString('utf8'), signature);
    return { success: true };
  }
}

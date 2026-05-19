import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { SubscriptionFilterDto } from './dto/subscription-filter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { CompanyRole, SchoolRole } from '../../shared/enums';

@ApiTags('Subscriptions')
@ApiBearerAuth('access-token')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN, CompanyRole.SUPPORT)
  @ApiOperation({ summary: 'List all subscriptions (company admin)' })
  async findAll(@Query() filters: SubscriptionFilterDto) {
    const data = await this.subscriptionsService.findAll(filters);
    return ApiResponse.success(data.items, 'Subscriptions fetched', data.meta);
  }

  @Get('my')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get own school active subscription' })
  async findMine(@GetSchoolId() schoolId: string) {
    const data = await this.subscriptionsService.findBySchoolId(schoolId);
    return ApiResponse.success(data);
  }

  @Get(':id')
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN, CompanyRole.SUPPORT)
  @ApiOperation({ summary: 'Get subscription by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.subscriptionsService.findById(id);
    return ApiResponse.success(data);
  }

  @Post()
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create subscription for a school' })
  async create(
    @Body() dto: CreateSubscriptionDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.subscriptionsService.create(dto, userId);
    return ApiResponse.created(data, 'Subscription created');
  }

  @Patch(':id')
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN)
  @ApiOperation({ summary: 'Update subscription' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    const data = await this.subscriptionsService.update(id, dto);
    return ApiResponse.success(data, 'Subscription updated');
  }

  @Post(':id/cancel')
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a subscription' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    const data = await this.subscriptionsService.cancel(id, dto);
    return ApiResponse.success(data, 'Subscription cancelled');
  }

  @Get(':id/payments')
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN, CompanyRole.SUPPORT)
  @ApiOperation({ summary: 'List payments for a subscription' })
  async getPayments(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.subscriptionsService.getPayments(id);
    return ApiResponse.success(data);
  }

  @Post(':id/payments')
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a payment for subscription' })
  async addPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePaymentDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.subscriptionsService.addPayment(id, dto, userId);
    return ApiResponse.created(data, 'Payment recorded');
  }
}

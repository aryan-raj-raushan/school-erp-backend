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
import { SubscriptionPlansService } from './subscription-plans.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { SubscriptionPlanFilterDto } from './dto/subscription-plan-filter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { CompanyRole } from '../../shared/enums';

@ApiTags('Subscription Plans')
@ApiBearerAuth('access-token')
@Controller('subscription-plans')
@Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN)
export class SubscriptionPlansController {
  constructor(private readonly plansService: SubscriptionPlansService) {}

  @Get()
  @ApiOperation({ summary: 'List the subscription plan catalog' })
  async findAll(@Query() filters: SubscriptionPlanFilterDto) {
    const data = await this.plansService.findAll(filters);
    return ApiResponse.success(data.items, 'Subscription plans fetched', data.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription plan by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.plansService.findById(id);
    return ApiResponse.success(data);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a subscription plan' })
  async create(@Body() dto: CreateSubscriptionPlanDto, @GetCurrentUserId() userId: string) {
    const data = await this.plansService.create(dto, userId);
    return ApiResponse.created(data, 'Subscription plan created');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subscription plan' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSubscriptionPlanDto) {
    const data = await this.plansService.update(id, dto);
    return ApiResponse.success(data, 'Subscription plan updated');
  }
}

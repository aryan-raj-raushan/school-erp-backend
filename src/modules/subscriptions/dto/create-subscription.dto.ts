import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  IsBoolean,
  IsDateString,
  MaxLength,
  IsUUID,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';
import {
  SubscriptionPlan,
  BillingModel,
  RestrictionMode,
  PaymentMethod,
} from '../../../shared/enums';

export class CreateSubscriptionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  school_id: string;

  // Pick an existing plan from the catalog — its fields are copied onto the
  // subscription. Omit to define a fully custom/ad-hoc plan inline below.
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  plan_id?: string;

  // Required when plan_id is not given (validated in service)
  @ApiPropertyOptional({ example: 'Standard Plan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  plan_name?: string;

  // Billing cycle — required when plan_id is not given
  @ApiPropertyOptional({ enum: SubscriptionPlan })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan_type?: SubscriptionPlan;

  // Required when plan_id is not given
  @ApiPropertyOptional({ enum: BillingModel })
  @IsOptional()
  @IsEnum(BillingModel)
  billing_model?: BillingModel;

  // Required when billing_model = FLAT and plan_id is not given
  @ApiPropertyOptional({ example: 4999 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount?: number;

  // Required when billing_model = PER_STUDENT and plan_id is not given
  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price_per_student?: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string = 'INR';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  max_students?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  max_staff?: number;

  @ApiPropertyOptional({ description: 'JSON array of feature strings' })
  @IsOptional()
  @IsString()
  features?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_trial?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  trial_end_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  auto_renew?: boolean;

  @ApiPropertyOptional({
    default: 0,
    description: 'Days after due_date before restriction kicks in',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  grace_period_days?: number;

  @ApiPropertyOptional({ enum: RestrictionMode, default: RestrictionMode.NONE })
  @IsOptional()
  @IsEnum(RestrictionMode)
  restriction_mode?: RestrictionMode;

  @ApiPropertyOptional({
    description:
      'PERMISSION_REGISTRY resource keys to block — only used when restriction_mode = SOFT',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  restricted_resources?: string[];

  @ApiPropertyOptional({ enum: PaymentMethod, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(PaymentMethod, { each: true })
  payment_methods_allowed?: PaymentMethod[];
}

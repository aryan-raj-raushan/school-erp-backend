import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsPositive,
  Max,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';
import { BillingModel, SubscriptionPlan } from '../../../shared/enums';
import { MONEY_DECIMAL_PLACES, MONEY_MAX_AMOUNT } from '../../../shared/constants';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'Standard — Per Student' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  name: string;

  @ApiProperty({ enum: BillingModel })
  @IsEnum(BillingModel)
  billing_model: BillingModel;

  // Required when billing_model = FLAT (validated in service)
  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: MONEY_DECIMAL_PLACES },
    { message: '$property must be a number with at most 2 decimal places' },
  )
  @IsPositive()
  @Max(MONEY_MAX_AMOUNT)
  @Type(() => Number)
  flat_amount?: number;

  // Required when billing_model = PER_STUDENT (validated in service)
  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: MONEY_DECIMAL_PLACES },
    { message: '$property must be a number with at most 2 decimal places' },
  )
  @IsPositive()
  @Max(MONEY_MAX_AMOUNT)
  @Type(() => Number)
  price_per_student?: number;

  @ApiProperty({ enum: SubscriptionPlan })
  @IsEnum(SubscriptionPlan)
  billing_cycle: SubscriptionPlan;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

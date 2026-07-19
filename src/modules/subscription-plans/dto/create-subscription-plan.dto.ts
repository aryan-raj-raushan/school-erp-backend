import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsPositive,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';
import { BillingModel, SubscriptionPlan } from '../../../shared/enums';

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
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  flat_amount?: number;

  // Required when billing_model = PER_STUDENT (validated in service)
  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
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

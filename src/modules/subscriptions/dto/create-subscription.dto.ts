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
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';
import { SubscriptionPlan } from '../../../shared/enums';

export class CreateSubscriptionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  school_id: string;

  @ApiProperty({ example: 'Standard Plan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  plan_name: string;

  @ApiProperty({ enum: SubscriptionPlan })
  @IsEnum(SubscriptionPlan)
  @IsNotEmpty()
  plan_type: SubscriptionPlan;

  @ApiProperty({ example: 4999 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;

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
}

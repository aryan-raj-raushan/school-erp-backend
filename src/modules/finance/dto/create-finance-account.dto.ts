import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsIn,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';
import { FINANCE_ACCOUNT_TYPES } from '../../../database/drizzle/schema/finance-accounts.schema';

export class CreateFinanceAccountDto {
  @ApiProperty({ example: 'SBI Bank', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => StringUtils.trim(value))
  name: string;

  @ApiProperty({ enum: FINANCE_ACCOUNT_TYPES })
  @IsString()
  @IsIn(FINANCE_ACCOUNT_TYPES)
  account_type: string;

  @ApiPropertyOptional({ example: 0, minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  opening_balance?: number;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  account_start_date: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

import { IsString, IsOptional, IsBoolean, MaxLength, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';
import { FINANCE_ACCOUNT_TYPES } from '../../../database/drizzle/schema/finance-accounts.schema';

export class UpdateFinanceAccountDto {
  @ApiPropertyOptional({ example: 'SBI Bank', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => StringUtils.trim(value))
  name?: string;

  @ApiPropertyOptional({ enum: FINANCE_ACCOUNT_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(FINANCE_ACCOUNT_TYPES)
  account_type?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

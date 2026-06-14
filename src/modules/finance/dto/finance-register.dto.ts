import { IsOptional, IsString, IsDateString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FINANCE_HEAD_TYPES } from '../../../database/drizzle/schema/finance-heads.schema';

export class FinanceRegisterDto {
  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Filter by account ID' })
  @IsOptional()
  @IsString()
  account_id?: string;

  @ApiPropertyOptional({ enum: FINANCE_HEAD_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(FINANCE_HEAD_TYPES)
  head_type?: string;
}

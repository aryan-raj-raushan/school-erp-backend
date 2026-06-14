import { IsInt, IsOptional, IsBoolean, IsIn, IsString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FINANCE_HEAD_TYPES } from '../../../database/drizzle/schema/finance-heads.schema';

export class FilterFinanceHeadDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;

  @ApiPropertyOptional({ enum: FINANCE_HEAD_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(FINANCE_HEAD_TYPES)
  head_type?: string;
}

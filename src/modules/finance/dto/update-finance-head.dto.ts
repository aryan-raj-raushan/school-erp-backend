import { IsString, IsOptional, IsBoolean, MaxLength, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';
import { FINANCE_HEAD_TYPES } from '../../../database/drizzle/schema/finance-heads.schema';

export class UpdateFinanceHeadDto {
  @ApiPropertyOptional({ example: 'Admission Fee', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => StringUtils.trim(value))
  name?: string;

  @ApiPropertyOptional({ enum: FINANCE_HEAD_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(FINANCE_HEAD_TYPES)
  head_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

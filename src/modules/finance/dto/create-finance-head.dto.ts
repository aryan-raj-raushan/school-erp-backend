import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';
import { FINANCE_HEAD_TYPES } from '../../../database/drizzle/schema/finance-heads.schema';

export class CreateFinanceHeadDto {
  @ApiProperty({ example: 'Admission Fee', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => StringUtils.trim(value))
  name: string;

  @ApiProperty({ enum: FINANCE_HEAD_TYPES })
  @IsString()
  @IsIn(FINANCE_HEAD_TYPES)
  head_type: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

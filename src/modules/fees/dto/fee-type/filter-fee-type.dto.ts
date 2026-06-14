import { IsOptional, IsEnum, IsBoolean, IsNumberString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class FilterFeeTypeDto {
  @ApiPropertyOptional({ enum: ['Class', 'Transport', 'Other'] })
  @IsOptional()
  @IsEnum(['Class', 'Transport', 'Other'])
  fee_category?: 'Class' | 'Transport' | 'Other';

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}

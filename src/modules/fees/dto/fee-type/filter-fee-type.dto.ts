import { IsOptional, IsEnum, IsBoolean, IsNumberString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ToBoolean } from '../../../../common/decorators/to-boolean.decorator';

export class FilterFeeTypeDto {
  @ApiPropertyOptional({ enum: ['Class', 'Transport', 'Other'] })
  @IsOptional()
  @IsEnum(['Class', 'Transport', 'Other'])
  fee_category?: 'Class' | 'Transport' | 'Other';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @ToBoolean()
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

import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { StringUtils } from '../../../../utils/string.utils';

export class CreateFeeTypeDto {
  @ApiProperty({ example: 'Tuition Fee' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => StringUtils.trim(value))
  name: string;

  @ApiPropertyOptional({ enum: ['Class', 'Transport', 'Other'], default: 'Class' })
  @IsOptional()
  @IsEnum(['Class', 'Transport', 'Other'])
  fee_category?: 'Class' | 'Transport' | 'Other';

  @ApiPropertyOptional({ enum: ['Monthly', 'Quarterly', 'Session', 'NA'], default: 'NA' })
  @IsOptional()
  @IsEnum(['Monthly', 'Quarterly', 'Session', 'NA'])
  frequency?: 'Monthly' | 'Quarterly' | 'Session' | 'NA';

  @ApiPropertyOptional({
    type: [String],
    example: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicable_months?: string[];

  @ApiPropertyOptional({
    description: 'Finance income head ID to auto-create income entry on payment',
  })
  @IsOptional()
  @IsString()
  income_head_id?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

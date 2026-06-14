import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateFeeLateRuleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiProperty({ type: [String], description: 'Fee type IDs this rule applies to' })
  @IsArray()
  @IsString({ each: true })
  applicable_fee_type_ids: string[];

  @ApiPropertyOptional({ description: 'Fee type ID used to record the late fine bill' })
  @IsOptional()
  @IsString()
  late_fine_fee_type_id?: string;

  @ApiProperty({ example: 55 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  late_fee_amount: number;

  @ApiProperty({ example: 2, description: 'Apply late fine N days after due date' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  days_after_due: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  start_from_current_month?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

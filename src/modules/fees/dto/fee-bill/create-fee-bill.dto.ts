import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateFeeBillDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  student_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fee_type_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fee_plan_id?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM format for monthly fees; omit for session fees' })
  @IsOptional()
  @IsString()
  bill_month?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  total_amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_manual?: boolean;
}

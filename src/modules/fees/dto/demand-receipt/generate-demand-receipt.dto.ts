import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateDemandReceiptDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  class_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiProperty({ description: 'Start month — YYYY-MM' })
  @IsString()
  @IsNotEmpty()
  month_from: string;

  @ApiProperty({ description: 'End month — YYYY-MM' })
  @IsString()
  @IsNotEmpty()
  month_to: string;
}

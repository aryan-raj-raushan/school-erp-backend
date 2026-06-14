import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkCreateFeeBillDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  class_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fee_plan_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fee_type_id: string;

  @ApiPropertyOptional({ description: 'YYYY-MM — required for Monthly/Quarterly fees' })
  @IsOptional()
  @IsString()
  bill_month?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  due_date?: string;
}

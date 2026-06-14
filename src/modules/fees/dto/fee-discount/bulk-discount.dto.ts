import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BulkDiscountDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fee_type_id: string;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  discount_amount: number;

  @ApiPropertyOptional({ description: 'Filter by class — applies to all students in class' })
  @IsOptional()
  @IsString()
  class_id?: string;

  @ApiPropertyOptional({
    description: 'Specific student IDs (if omitted with class_id, applies to all in class)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  student_ids?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

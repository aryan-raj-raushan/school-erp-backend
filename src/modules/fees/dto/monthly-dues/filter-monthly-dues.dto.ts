import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FilterMonthlyDuesDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  class_id: string;

  @ApiProperty({ description: 'YYYY-MM', example: '2026-04' })
  @IsString()
  @IsNotEmpty()
  month: string;
}

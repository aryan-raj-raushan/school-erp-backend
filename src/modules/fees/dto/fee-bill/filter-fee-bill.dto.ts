import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterFeeBillDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  student_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  class_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  academic_year_id?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM' })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({ enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED'] })
  @IsOptional()
  @IsEnum(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED'])
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}

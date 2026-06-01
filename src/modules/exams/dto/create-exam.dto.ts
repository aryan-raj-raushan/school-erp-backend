import { IsString, IsNotEmpty, IsOptional, IsDateString, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';

export class CreateExamDto {
  @ApiProperty({ example: 'Mid-Term Examination 2025' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => StringUtils.trim(value))
  name: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => StringUtils.trim(value))
  description?: string;

  @ApiPropertyOptional({ example: '2025-10-01' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ example: '2025-10-15' })
  @IsOptional()
  @IsDateString()
  end_date?: string;
}

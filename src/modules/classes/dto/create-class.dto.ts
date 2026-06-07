import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';

export class CreateClassDto {
  @ApiProperty({ example: 'Class 10', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => StringUtils.trim(value))
  name: string;

  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiPropertyOptional({ example: 'uuid-of-timetable-session' })
  @IsOptional()
  @IsUUID()
  timetable_session_id?: string;

  @ApiPropertyOptional({ example: 'Science', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  department?: string;

  @ApiPropertyOptional({ example: 'Regular', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => StringUtils.trim(value))
  class_type?: string;

  @ApiPropertyOptional({ example: 1, description: 'Display order / sequence of the class' })
  @IsOptional()
  @IsInt()
  @Min(1)
  class_sequence?: number;

  @ApiPropertyOptional({ example: 6, description: 'Number of sessions per week' })
  @IsOptional()
  @IsInt()
  @Min(1)
  no_of_sessions?: number;

  @ApiPropertyOptional({ example: 'CLS-10A', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => StringUtils.trim(value))
  class_code?: string;

  @ApiPropertyOptional({ example: 'ABCDE', maxLength: 26, description: 'Available section labels, e.g. "ABCDE"' })
  @IsOptional()
  @IsString()
  @MaxLength(26)
  @Transform(({ value }) => StringUtils.trim(value))
  default_sections?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  numeric_value?: number;

  @ApiPropertyOptional({ example: 'Senior secondary class', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => StringUtils.trim(value))
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

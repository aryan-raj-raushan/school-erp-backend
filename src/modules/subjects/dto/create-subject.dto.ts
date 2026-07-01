import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { REGEX } from '../../../utils/regex.utils';
import { StringUtils } from '../../../utils/string.utils';

export class CreateSubjectDto {
  @ApiProperty({ example: 'Mathematics', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  name: string;

  @ApiPropertyOptional({ example: 'MATH-10', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(REGEX.SUBJECT_CODE, {
    message: 'Code must be 2-20 uppercase alphanumeric chars with optional hyphens',
  })
  @Transform(({ value }) => StringUtils.trim(value)?.toUpperCase())
  code?: string;

  @ApiPropertyOptional({ example: 0, description: 'Display order in subject list' })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;

  @ApiPropertyOptional({ example: 100, description: 'Total marks for the subject' })
  @IsOptional()
  @IsInt()
  @Min(0)
  total_marks?: number;

  @ApiPropertyOptional({ example: 35, description: 'Passing marks for the subject' })
  @IsOptional()
  @IsInt()
  @Min(0)
  passing_marks?: number;

  @ApiPropertyOptional({ example: 'Core mathematics curriculum', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(({ value }) => StringUtils.trim(value))
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_elective?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

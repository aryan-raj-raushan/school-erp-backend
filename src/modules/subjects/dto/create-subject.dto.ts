import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  Matches,
  MaxLength,
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
  @Matches(REGEX.SUBJECT_CODE, { message: 'Code must be 2-20 uppercase alphanumeric chars with optional hyphens' })
  @Transform(({ value }) => StringUtils.trim(value)?.toUpperCase())
  code?: string;

  @ApiPropertyOptional({
    example: 'uuid-of-class',
    description: 'Null means school-wide subject',
  })
  @IsOptional()
  @IsUUID()
  class_id?: string;

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
}

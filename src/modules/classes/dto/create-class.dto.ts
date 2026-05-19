import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  MaxLength,
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
}

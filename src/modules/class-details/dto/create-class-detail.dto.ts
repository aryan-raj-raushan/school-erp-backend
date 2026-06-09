import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';

export class CreateClassDetailDto {
  @ApiProperty({ example: 'uuid-of-class' })
  @IsUUID()
  @IsNotEmpty()
  class_id: string;

  @ApiProperty({ example: 'NURSERY', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  name: string;

  @ApiPropertyOptional({ example: 'NURSERY 2019-2020', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => StringUtils.trim(value))
  class_code?: string;

  @ApiPropertyOptional({ example: 'Year 1', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => StringUtils.trim(value))
  year?: string;

  @ApiPropertyOptional({ example: 4, description: 'Maximum number of internal exams' })
  @IsOptional()
  @IsInt()
  @Min(0)
  max_internal_exam?: number;

  @ApiPropertyOptional({ example: 2, description: 'Best internal exams to count for scoring' })
  @IsOptional()
  @IsInt()
  @Min(0)
  best_internal_exam_count?: number;

  @ApiPropertyOptional({ example: 1, description: 'Number of elective subjects' })
  @IsOptional()
  @IsInt()
  @Min(0)
  no_of_elective_subjects?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

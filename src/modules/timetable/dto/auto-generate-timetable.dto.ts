import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';

export class AutoGenerateTimetableDto {
  @ApiPropertyOptional({ default: 'DEFAULT' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  name?: string;

  @ApiProperty()
  @IsUUID()
  academic_year_id: string;

  @ApiProperty()
  @IsUUID()
  class_id: string;

  @ApiProperty({ description: 'Which School Timing profile to read the school day window from' })
  @IsUUID()
  @IsNotEmpty()
  school_timing_id: string;

  @ApiPropertyOptional({ description: 'Insert a lunch break after this many teaching periods' })
  @IsOptional()
  @IsInt()
  @Min(1)
  lunch_after_period?: number;

  @ApiPropertyOptional({ description: 'Lunch break duration, in minutes' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(180)
  lunch_duration_minutes?: number;
}

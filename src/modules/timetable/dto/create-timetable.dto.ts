import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';

export class PeriodTimeDto {
  @ApiProperty() @IsInt() @Min(1) @Max(20) period_number: number;
  @ApiProperty({ example: '08:30' }) @IsString() @IsNotEmpty() start_time: string;
  @ApiProperty({ example: '09:00' }) @IsString() @IsNotEmpty() end_time: string;
  @ApiPropertyOptional({ default: false, description: 'True for a break/lunch slot' })
  @IsOptional()
  @IsBoolean()
  is_break?: boolean;
}

export class TimetableEntryDto {
  @ApiProperty({
    enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
  })
  @IsString()
  @IsNotEmpty()
  day_of_week: string;

  @ApiProperty() @IsInt() @Min(1) @Max(20) period_number: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() subject_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teacher_id?: string;
}

export class CreateTimetableDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() academic_year_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() class_id?: string;

  @ApiPropertyOptional({ default: 'DEFAULT' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  name?: string;

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  max_periods?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_complete?: boolean;

  @ApiPropertyOptional({ type: [PeriodTimeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PeriodTimeDto)
  period_times?: PeriodTimeDto[];

  @ApiPropertyOptional({ type: [TimetableEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimetableEntryDto)
  entries?: TimetableEntryDto[];

  @ApiPropertyOptional() @IsOptional() @IsUUID() class_teacher_id?: string;
}

import { IsString, IsOptional, IsEnum, IsInt, Min, Max, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ShiftTypeDto {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  EVENING = 'EVENING',
  NIGHT = 'NIGHT',
  ADMIN = 'ADMIN',
  SPLIT = 'SPLIT',
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateStaffShiftDto {
  @ApiProperty()
  @IsString()
  staff_id: string;

  @ApiProperty({ example: 'Morning Shift' })
  @IsString()
  @MaxLength(100)
  shift_name: string;

  @ApiProperty({ enum: ShiftTypeDto })
  @IsEnum(ShiftTypeDto)
  shift_type: ShiftTypeDto;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'shift_start must be HH:MM' })
  shift_start: string;

  @ApiProperty({ example: '14:00' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'shift_end must be HH:MM' })
  shift_end: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  grace_period_minutes?: number;

  @ApiPropertyOptional({ example: 'MON,TUE,WED,THU,FRI' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  working_days?: string;

  @ApiProperty({ example: '2025-04-01' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'effective_from must be YYYY-MM-DD' })
  effective_from: string;

  @ApiProperty({ example: '2025-09-30' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'effective_to must be YYYY-MM-DD' })
  effective_to: string;
}

export class UpdateStaffShiftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shift_name?: string;

  @ApiPropertyOptional({ enum: ShiftTypeDto })
  @IsOptional()
  @IsEnum(ShiftTypeDto)
  shift_type?: ShiftTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'shift_start must be HH:MM' })
  shift_start?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'shift_end must be HH:MM' })
  shift_end?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  grace_period_minutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  working_days?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'effective_from must be YYYY-MM-DD' })
  effective_from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'effective_to must be YYYY-MM-DD' })
  effective_to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  is_active?: string;
}

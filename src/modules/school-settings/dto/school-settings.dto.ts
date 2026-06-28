import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsDateString,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export enum AttendanceMethodDto {
  MANUAL = 'MANUAL',
  RFID = 'RFID',
  BOTH = 'BOTH',
  BIOMETRIC = 'BIOMETRIC',
  QR = 'QR',
}

export enum ConflictResolutionDto {
  MANUAL_WINS = 'MANUAL_WINS',
  RFID_WINS = 'RFID_WINS',
  FLAG_FOR_REVIEW = 'FLAG_FOR_REVIEW',
}

export class UpdateSchoolSettingsDto {
  @ApiPropertyOptional({ enum: AttendanceMethodDto })
  @IsOptional()
  @IsEnum(AttendanceMethodDto)
  attendance_method?: AttendanceMethodDto;

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  attendance_lock_hours?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  three_lates_equal_half_day?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  two_half_days_equal_leave?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  auto_notify_parent_on_absent?: boolean;

  @ApiPropertyOptional({ enum: ConflictResolutionDto })
  @IsOptional()
  @IsEnum(ConflictResolutionDto)
  conflict_resolution_mode?: ConflictResolutionDto;
}

export enum TimingTypeDto {
  SUMMER = 'SUMMER',
  WINTER = 'WINTER',
  EXAM = 'EXAM',
  SATURDAY = 'SATURDAY',
  RAMADAN = 'RAMADAN',
  SPECIAL = 'SPECIAL',
  DEFAULT = 'DEFAULT',
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateSchoolTimingDto {
  @ApiProperty({ example: 'Summer Schedule' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: TimingTypeDto })
  @IsEnum(TimingTypeDto)
  timing_type: TimingTypeDto;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'school_start_time must be HH:MM' })
  school_start_time: string;

  @ApiProperty({ example: '14:00' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'school_end_time must be HH:MM' })
  school_end_time: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  grace_period_minutes?: number;

  @ApiPropertyOptional({ example: '08:15' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'late_cutoff_time must be HH:MM' })
  late_cutoff_time?: string;

  @ApiPropertyOptional({ example: '10:30' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'half_day_cutoff_time must be HH:MM' })
  half_day_cutoff_time?: string;

  @ApiPropertyOptional({ example: '12:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'absent_cutoff_time must be HH:MM' })
  absent_cutoff_time?: string;

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

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}

export class UpdateSchoolTimingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: TimingTypeDto })
  @IsOptional()
  @IsEnum(TimingTypeDto)
  timing_type?: TimingTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'school_start_time must be HH:MM' })
  school_start_time?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'school_end_time must be HH:MM' })
  school_end_time?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  grace_period_minutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'late_cutoff_time must be HH:MM' })
  late_cutoff_time?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'half_day_cutoff_time must be HH:MM' })
  half_day_cutoff_time?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'absent_cutoff_time must be HH:MM' })
  absent_cutoff_time?: string;

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
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class SetClassTimingDto {
  @ApiPropertyOptional({ description: 'null to remove override' })
  @IsOptional()
  @IsString()
  timing_id?: string | null;
}

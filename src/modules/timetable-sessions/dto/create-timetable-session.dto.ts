import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TimetableSessionType } from '../../../shared/enums';
import { StringUtils } from '../../../utils/string.utils';

export class CreateTimetableSessionDto {
  @ApiProperty({ example: 'Winter Session 2024-25', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  name: string;

  @ApiPropertyOptional({ example: 'WIN-24', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => StringUtils.trim(value))
  session_code?: string;

  @ApiProperty({ enum: Object.values(TimetableSessionType), example: TimetableSessionType.WINTER })
  @IsEnum(TimetableSessionType)
  @IsNotEmpty()
  timetable_session: TimetableSessionType;

  @ApiPropertyOptional({ example: 'uuid-of-academic-year' })
  @IsOptional()
  @IsUUID()
  academic_year_id?: string;

  @ApiProperty({ example: '2024-11-01' })
  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @ApiProperty({ example: '2025-02-28' })
  @IsDateString()
  @IsNotEmpty()
  end_date: string;

  @ApiPropertyOptional({ example: 'Winter timetable session for 2024-25' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => StringUtils.trim(value))
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_active_session?: boolean;
}

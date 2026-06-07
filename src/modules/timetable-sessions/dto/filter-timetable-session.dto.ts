import { IsOptional, IsEnum, IsUUID, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TimetableSessionType } from '../../../shared/enums';

export class FilterTimetableSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  academic_year_id?: string;

  @ApiPropertyOptional({ enum: Object.values(TimetableSessionType) })
  @IsOptional()
  @IsEnum(TimetableSessionType)
  timetable_session?: TimetableSessionType;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_active_session?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

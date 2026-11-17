import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  IsBoolean,
  MaxLength,
  IsIn,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum StaffAttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  HALF_DAY = 'HALF_DAY',
}

export class StaffAttendanceEntryDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  staff_id: string;

  @ApiProperty({ enum: StaffAttendanceStatus })
  @IsEnum(StaffAttendanceStatus)
  @IsNotEmpty()
  status: StaffAttendanceStatus;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_late?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;
}

export class MarkStaffAttendanceDto {
  @ApiProperty({ example: '2025-06-01' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ type: [StaffAttendanceEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffAttendanceEntryDto)
  entries: StaffAttendanceEntryDto[];
}

export class StaffAttendanceFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;
}

export class StaffAttendanceRangeDto {
  @ApiProperty({ example: '2026-10-01' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ example: '2026-10-31' })
  @IsDateString()
  end_date: string;

  @ApiPropertyOptional({ example: 'TEACHER' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  role?: string;
}

export class StaffAttendanceExportDto extends StaffAttendanceRangeDto {
  @ApiPropertyOptional({ enum: ['xlsx', 'csv'], default: 'xlsx' })
  @IsOptional()
  @IsIn(['xlsx', 'csv'])
  format?: 'xlsx' | 'csv' = 'xlsx';
}

export class StaffPunchInDto {
  @ApiProperty({ example: 26.8467 })
  @IsNumber({}, { message: 'Location is required to punch in' })
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 80.9462 })
  @IsNumber({}, { message: 'Location is required to punch in' })
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: 25, description: 'GPS accuracy in metres' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;
}

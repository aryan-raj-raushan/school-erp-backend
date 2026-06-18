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
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum StaffAttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
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

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

export enum MarkAttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
}

export class AttendanceEntryDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  student_id: string;

  @ApiProperty({ enum: MarkAttendanceStatus, description: 'Only PRESENT or ABSENT accepted' })
  @IsEnum(MarkAttendanceStatus)
  @IsNotEmpty()
  status: MarkAttendanceStatus;

  @ApiPropertyOptional({ default: false, description: 'Mark student as late (used with PRESENT)' })
  @IsOptional()
  @IsBoolean()
  is_late?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;
}

export class MarkAttendanceDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  class_section_id: string;

  @ApiProperty({ example: '2025-06-01' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ type: [AttendanceEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];
}

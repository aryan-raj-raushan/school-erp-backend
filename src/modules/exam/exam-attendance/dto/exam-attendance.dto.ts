import { IsEnum, IsUUID, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@shared/enums/exam.enum';
import { ExamPaginationDto } from '@shared/dto/exam-pagination.dto';

// ── Single student-schedule entry ─────────────────────────────────────────────

export class AttendanceEntryDto {
  @ApiProperty({ example: 'uuid-of-student' })
  @IsUUID()
  student_id: string;

  @ApiProperty({ example: 'uuid-of-schedule' })
  @IsUUID()
  schedule_id: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({ example: 'Medical leave' })
  @IsOptional()
  @IsString()
  remarks?: string;
}

/** Bulk mark attendance: all students × all schedules in one call */
export class BulkMarkAttendanceDto {
  @ApiProperty({ example: 'uuid-of-exam' })
  @IsUUID()
  exam_id: string;

  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  academic_year_id: string;

  @ApiProperty({ type: [AttendanceEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];
}

export class FilterAttendanceDto extends ExamPaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  academic_year_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  exam_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  schedule_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  student_id?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;
}

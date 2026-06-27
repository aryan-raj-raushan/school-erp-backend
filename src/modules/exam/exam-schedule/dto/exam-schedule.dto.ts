import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsUUID,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubjectType } from '@shared/enums/exam.enum';
import { ExamPaginationDto } from '@shared/dto/exam-pagination.dto';
// ── Sub-subject (e.g. Physics Practical) ─────────────────────────────────────

export class CreateSubScheduleDto {
  @ApiProperty({ enum: SubjectType, example: SubjectType.PRACTICAL_EXAM })
  @IsEnum(SubjectType)
  subject_type: SubjectType;

  @ApiProperty({ example: 'Physics Practical' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  subject_name: string;

  @ApiProperty({ example: '2025-09-05' })
  @IsDateString()
  exam_date: string;

  @ApiProperty({ example: '09:00' })
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'start_time must be HH:mm or HH:mm:ss' })
  start_time: string;

  @ApiProperty({ example: '11:00' })
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'end_time must be HH:mm or HH:mm:ss' })
  end_time: string;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(0)
  exam_marks: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(0)
  passing_marks: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  exam_invigilator_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  hall_detail_id?: string;
}

// ── Main schedule entry ───────────────────────────────────────────────────────

export class CreateExamScheduleItemDto {
  @ApiProperty({ example: 'uuid-of-subject' })
  @IsUUID()
  subject_id: string;

  @ApiProperty({ example: 'Physics' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  subject_name: string;

  @ApiPropertyOptional({ enum: SubjectType, default: SubjectType.MAIN_EXAM })
  @IsOptional()
  @IsEnum(SubjectType)
  subject_type?: SubjectType;

  @ApiProperty({ example: '2025-09-02' })
  @IsDateString()
  exam_date: string;

  @ApiProperty({ example: '09:00' })
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'start_time must be HH:mm or HH:mm:ss' })
  start_time: string;

  @ApiProperty({ example: '12:00' })
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'end_time must be HH:mm or HH:mm:ss' })
  end_time: string;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  exam_marks: number;

  @ApiProperty({ example: 35 })
  @IsInt()
  @Min(0)
  passing_marks: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  exam_invigilator_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  hall_detail_id?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  sub_subject_enabled?: boolean;

  /** Sub-subject rows (e.g. Practical, Oral) — only if sub_subject_enabled = true */
  @ApiPropertyOptional({ type: [CreateSubScheduleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSubScheduleDto)
  sub_schedules?: CreateSubScheduleDto[];
}

/** Bulk create — accepts an array of schedule items for one exam */
export class CreateExamScheduleBulkDto {
  @ApiProperty({ example: 'uuid-of-exam' })
  @IsUUID()
  exam_id: string;

  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  academic_year_id: string;

  @ApiProperty({ example: 'uuid-of-class' })
  @IsUUID()
  class_id: string;

  @ApiPropertyOptional({ example: 'uuid-of-section' })
  @IsOptional()
  @IsUUID()
  section_id?: string;

  @ApiProperty({ type: [CreateExamScheduleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExamScheduleItemDto)
  schedules: CreateExamScheduleItemDto[];
}

export class UpdateExamScheduleDto extends PartialType(CreateExamScheduleItemDto) {}

export class FilterExamScheduleDto extends ExamPaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  academic_year_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  class_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  section_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  exam_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  subject_id?: string;

  @ApiPropertyOptional({ enum: SubjectType })
  @IsOptional()
  @IsEnum(SubjectType)
  subject_type?: SubjectType;

  @ApiPropertyOptional({ example: '2025-09-02' })
  @IsOptional()
  @IsDateString()
  exam_date?: string;
}

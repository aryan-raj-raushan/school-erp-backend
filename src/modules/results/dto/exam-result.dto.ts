import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Bulk Upsert ─────────────────────────────────────────────────────────────

export class SingleStudentResultDto {
  @ApiProperty({ description: 'Student UUID' })
  @IsUUID()
  student_id: string;

  @ApiProperty({ description: 'ExamSchedule UUID (subject row)' })
  @IsUUID()
  exam_schedule_id: string;

  @ApiProperty({ description: 'Subject UUID' })
  @IsUUID()
  subject_id: string;

  @ApiPropertyOptional({ description: 'Marks obtained; omit or null if absent' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  marks_obtained?: number | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_absent?: boolean;
}

export class BulkUpsertExamResultsDto {
  @ApiProperty({ description: 'Exam UUID' })
  @IsUUID()
  exam_id: string;

  @ApiProperty({ description: 'Class UUID' })
  @IsUUID()
  class_id: string;

  @ApiPropertyOptional({ description: 'Section UUID' })
  @IsOptional()
  @IsUUID()
  section_id?: string;

  @ApiProperty({ description: 'Academic Year UUID' })
  @IsUUID()
  academic_year_id: string;

  @ApiProperty({ type: [SingleStudentResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleStudentResultDto)
  results: SingleStudentResultDto[];
}

// ─── Publish Exam Result ──────────────────────────────────────────────────────

export class PublishExamResultDto {
  @ApiProperty({ description: 'Exam UUID' })
  @IsUUID()
  exam_id: string;

  @ApiPropertyOptional({ description: 'Class UUID; required if publishing per class' })
  @IsOptional()
  @IsUUID()
  class_id?: string;

  @ApiPropertyOptional({ description: 'Section UUID' })
  @IsOptional()
  @IsUUID()
  section_id?: string;

  @ApiProperty({ description: 'true → publish, false → unpublish' })
  @IsBoolean()
  is_published: boolean;
}

// ─── Filter ──────────────────────────────────────────────────────────────────

export class FilterExamResultDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  exam_id?: string;

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
  academic_year_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  student_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

// ─── Report Card Generate ─────────────────────────────────────────────────────

export class GenerateReportCardDto {
  @ApiProperty({ description: 'Exam UUID' })
  @IsUUID()
  exam_id: string;

  @ApiProperty({ description: 'Class UUID' })
  @IsUUID()
  class_id: string;

  @ApiPropertyOptional({ description: 'Section UUID — omit to generate for all sections' })
  @IsOptional()
  @IsUUID()
  section_id?: string;

  @ApiPropertyOptional({ description: 'Single student UUID — omit to generate for whole class' })
  @IsOptional()
  @IsUUID()
  student_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}

// ─── Publish Report Card ──────────────────────────────────────────────────────

export class PublishReportCardDto {
  @ApiProperty({ description: 'Exam UUID' })
  @IsUUID()
  exam_id: string;

  @ApiPropertyOptional({ description: 'Class UUID' })
  @IsOptional()
  @IsUUID()
  class_id?: string;

  @ApiPropertyOptional({ description: 'Section UUID' })
  @IsOptional()
  @IsUUID()
  section_id?: string;

  @ApiPropertyOptional({ description: 'Single student UUID' })
  @IsOptional()
  @IsUUID()
  student_id?: string;

  @ApiProperty()
  @IsBoolean()
  is_published: boolean;
}

// ─── Filter Report Card ───────────────────────────────────────────────────────

export class FilterReportCardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  exam_id?: string;

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
  academic_year_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  student_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

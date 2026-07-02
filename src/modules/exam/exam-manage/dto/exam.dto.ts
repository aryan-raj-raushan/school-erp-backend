import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsUUID,
  IsArray,
  ArrayMinSize,
  IsInt,
  Min,
  Matches,
  MaxLength,
} from 'class-validator';
import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamPaginationDto } from '@shared/dto/exam-pagination.dto';
import { ExamTerm, ExamStatus } from '@shared/enums/exam.enum';

export class CreateExamDto {
  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  academic_year_id: string;

  @ApiProperty({
    type: [String],
    example: ['uuid-of-class-1', 'uuid-of-class-2'],
    description: 'Classes participating in this exam — one exam can span the whole school',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  class_ids: string[];

  @ApiPropertyOptional({ example: 'TERM1-2026', description: 'Auto-derived if omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @ApiProperty({ example: 'Mid-Term Examination 2025' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  exam_name: string;

  @ApiProperty({ enum: ExamTerm })
  @IsEnum(ExamTerm)
  exam_term: ExamTerm;

  @ApiProperty({ example: '2025-09-01' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ example: '2025-09-10' })
  @IsDateString()
  end_date: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  include_in_marks?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

export class UpdateExamDto extends PartialType(CreateExamDto) {}

export class PublishExamDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  is_published: boolean;
}

export class ChangeExamStatusDto {
  @ApiProperty({ enum: ExamStatus })
  @IsEnum(ExamStatus)
  status: ExamStatus;
}

export class FilterExamDto extends ExamPaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  academic_year_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  class_id?: string;

  @ApiPropertyOptional({ enum: ExamTerm })
  @IsOptional()
  @IsEnum(ExamTerm)
  exam_term?: ExamTerm;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}

// ── Auto-generate ────────────────────────────────────────────────────────────

export class AutoGenerateExamDto {
  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  academic_year_id: string;

  @ApiProperty({
    type: [String],
    example: ['uuid-of-class-1', 'uuid-of-class-2'],
    description: 'Classes participating in this exam',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  class_ids: string[];

  @ApiProperty({ example: 'Mid-Term Examination 2025' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  exam_name: string;

  @ApiProperty({ enum: ExamTerm })
  @IsEnum(ExamTerm)
  exam_term: ExamTerm;

  @ApiProperty({ example: '2025-09-01' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ example: '2025-09-10' })
  @IsDateString()
  end_date: string;

  @ApiPropertyOptional({ example: '09:00', default: '09:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'daily_start_time must be HH:mm or HH:mm:ss' })
  daily_start_time?: string;

  @ApiPropertyOptional({ example: '12:00', default: '12:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'daily_end_time must be HH:mm or HH:mm:ss' })
  daily_end_time?: string;

  @ApiPropertyOptional({ example: 100, default: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  default_exam_marks?: number;

  @ApiPropertyOptional({ example: 35, default: 35 })
  @IsOptional()
  @IsInt()
  @Min(0)
  default_passing_marks?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  include_in_marks?: boolean;

  @ApiPropertyOptional({ description: 'Pre-fill marks/duration defaults from a saved template' })
  @IsOptional()
  @IsUUID()
  template_id?: string;
}

export class CopyExamDto {
  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  target_academic_year_id: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  new_start_date: string;
}

export class RegenerateApplyDto extends AutoGenerateExamDto {
  @ApiPropertyOptional({
    default: false,
    description: 'Overwrite schedule rows that already have attendance recorded',
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class AutoGenerateConflictDto {
  @ApiProperty() class_id: string;
  @ApiProperty() class_name: string;
  @ApiProperty() subject_name: string;
  @ApiPropertyOptional() exam_date?: string;
  @ApiProperty({
    enum: ['NO_SUBJECT_MAPPING', 'NOT_ENOUGH_WORKING_DAYS', 'NO_INVIGILATOR_AVAILABLE'],
  })
  reason: 'NO_SUBJECT_MAPPING' | 'NOT_ENOUGH_WORKING_DAYS' | 'NO_INVIGILATOR_AVAILABLE';
}

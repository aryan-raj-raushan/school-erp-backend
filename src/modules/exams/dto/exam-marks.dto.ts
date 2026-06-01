import { IsNotEmpty, IsUUID, IsOptional, IsNumber, IsBoolean, IsString, IsArray, ValidateNested, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExamMarkEntryDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  student_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  marks_obtained?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_absent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5)
  grade?: string;
}

export class BulkExamMarksDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  exam_id: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  subject_id: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  class_section_id: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  total_marks: number;

  @ApiProperty({ type: [ExamMarkEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamMarkEntryDto)
  entries: ExamMarkEntryDto[];
}

export class TeacherRemarkDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  exam_id: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  student_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  remark: string;
}

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
import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamPaginationDto } from '@shared/dto/exam-pagination.dto';
import { ExamTerm } from '@shared/enums/exam.enum';

export class CreateExamDto {
  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  academic_year_id: string;

  @ApiProperty({ example: 'uuid-of-class' })
  @IsUUID()
  class_id: string;

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

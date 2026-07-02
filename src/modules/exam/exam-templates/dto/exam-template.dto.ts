import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsInt, Min, MaxLength } from 'class-validator';
import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamTerm } from '@shared/enums/exam.enum';

export class CreateExamTemplateDto {
  @ApiProperty({ example: 'Unit Test' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({ enum: ExamTerm })
  @IsEnum(ExamTerm)
  exam_term: ExamTerm;

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

  @ApiPropertyOptional({ example: 180, default: 180 })
  @IsOptional()
  @IsInt()
  @Min(0)
  default_duration_minutes?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateExamTemplateDto extends PartialType(CreateExamTemplateDto) {}

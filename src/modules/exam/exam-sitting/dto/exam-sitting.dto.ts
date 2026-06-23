import {
  IsUUID,
  IsOptional,
  IsInt,
  IsString,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamPaginationDto } from '@shared/dto/exam-pagination.dto';

export class CreateSittingPlanEntryDto {
  @ApiProperty({ example: 'uuid-of-student' })
  @IsUUID()
  student_id: string;

  @ApiProperty({ example: 'uuid-of-hall-detail (room)' })
  @IsUUID()
  hall_detail_id: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  seat_number?: number;

  @ApiPropertyOptional({ example: 'A-12' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  roll_number?: string;
}

export class CreateSittingPlanBulkDto {
  @ApiProperty({ example: 'uuid-of-exam' })
  @IsUUID()
  exam_id: string;

  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  academic_year_id: string;

  @ApiProperty({ example: 'uuid-of-hall-plan' })
  @IsUUID()
  hall_plan_id: string;

  @ApiProperty({ type: [CreateSittingPlanEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSittingPlanEntryDto)
  entries: CreateSittingPlanEntryDto[];
}

export class UpdateSittingPlanDto extends PartialType(CreateSittingPlanEntryDto) {}

export class FilterSittingPlanDto extends ExamPaginationDto {
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
  hall_plan_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  hall_detail_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  student_id?: string;
}

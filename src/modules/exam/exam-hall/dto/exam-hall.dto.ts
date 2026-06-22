import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamPaginationDto } from '@shared/dto/exam-pagination.dto';

// ── Hall Plan ─────────────────────────────────────────────────────────────────

export class CreateHallPlanDto {
  @ApiProperty({ example: 'Hall Plan A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  plan_name: string;

  @ApiPropertyOptional({ example: 'Used for Term 1 exams' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

export class UpdateHallPlanDto extends PartialType(CreateHallPlanDto) {}

export class FilterHallPlanDto extends ExamPaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

// ── Hall Details ──────────────────────────────────────────────────────────────

export class CreateHallDetailDto {
  @ApiProperty({ example: 'uuid-of-hall-plan' })
  @IsUUID()
  hall_plan_id: string;

  @ApiProperty({ example: 'Room 101' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  room_name: string;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(1)
  sitting_capacity: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

export class UpdateHallDetailDto extends PartialType(CreateHallDetailDto) {}

export class FilterHallDetailDto extends ExamPaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  hall_plan_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

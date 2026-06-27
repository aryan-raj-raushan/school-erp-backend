import {
  IsString, IsOptional, IsInt, IsBoolean, IsUUID, Min, Max, MaxLength,
} from 'class-validator';
import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamPaginationDto } from '@shared/dto/exam-pagination.dto';

export class CreateHallDetailDto {
  @ApiProperty({ example: 'Room 101' })
  @IsString()
  @MaxLength(150)
  room_name: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sitting_capacity?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  grid_rows?: number;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  grid_cols?: number;

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
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  is_enabled?: boolean;
}

import { IsOptional, IsUUID, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dto/pagination.dto';

export class SubjectFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by class ID' })
  @IsOptional()
  @IsUUID()
  class_id?: string;

  @ApiPropertyOptional({ description: 'Filter by class detail (year/semester) ID' })
  @IsOptional()
  @IsUUID()
  class_detail_id?: string;

  @ApiPropertyOptional({ description: 'Search by subject name' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;
}

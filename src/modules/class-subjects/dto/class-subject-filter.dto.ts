import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dto/pagination.dto';

export class ClassSubjectFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  class_section_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  academic_year_id?: string;
}

import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dto/pagination.dto';

export class FilterSyllabusDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  class_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  timetable_session_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  class_detail_id?: string;
}

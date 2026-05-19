import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dto/pagination.dto';

export class ClassFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by academic year ID' })
  @IsOptional()
  @IsUUID()
  academic_year_id?: string;
}

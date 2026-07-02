import { IsOptional, IsUUID, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { StringUtils } from '../../../utils/string.utils';

export class ClassFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by academic year ID' })
  @IsOptional()
  @IsUUID()
  academic_year_id?: string;

  @ApiPropertyOptional({ description: 'Filter by class type' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => StringUtils.trim(value))
  class_type?: string;
}

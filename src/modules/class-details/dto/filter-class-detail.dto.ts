import { IsOptional, IsUUID, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { StringUtils } from '../../../utils/string.utils';

export class FilterClassDetailDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by class ID' })
  @IsOptional()
  @IsUUID()
  class_id?: string;

  @ApiPropertyOptional({ description: 'Filter by timetable session ID' })
  @IsOptional()
  @IsUUID()
  timetable_session_id?: string;

  @ApiPropertyOptional({ description: 'Filter by year/semester label' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => StringUtils.trim(value))
  year?: string;
}

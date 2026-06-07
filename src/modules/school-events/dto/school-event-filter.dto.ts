import { IsOptional, IsEnum, IsUUID, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dto/pagination.dto';

export enum SchoolEventType {
  EVENT = 'EVENT',
  HOLIDAY = 'HOLIDAY',
}

export class SchoolEventFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: SchoolEventType, description: 'Filter by type: EVENT or HOLIDAY' })
  @IsOptional()
  @IsEnum(SchoolEventType)
  type?: SchoolEventType;

  @ApiPropertyOptional({ example: 'uuid-of-academic-year' })
  @IsOptional()
  @IsUUID()
  academic_year_id?: string;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;
}
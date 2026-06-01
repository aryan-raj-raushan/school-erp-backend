import { IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';

export class CreateHomeworkDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  class_section_id: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  subject_id: string;

  @ApiProperty({ example: 'Chapter 5 Exercise' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }) => StringUtils.trim(value))
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2025-06-15' })
  @IsDateString()
  @IsNotEmpty()
  due_date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attachment_url?: string;
}

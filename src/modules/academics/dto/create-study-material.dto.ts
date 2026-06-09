import { IsString, IsNotEmpty, IsOptional, IsUUID, IsIn, MaxLength, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';

export class CreateStudyMaterialDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  class_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  class_detail_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  subject_id?: string;

  @ApiProperty({ example: 'Chapter 5 Notes' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }) => StringUtils.trim(value))
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'file', enum: ['text', 'file', 'youtube'] })
  @IsIn(['text', 'file', 'youtube'])
  content_type: 'text' | 'file' | 'youtube';

  @ApiPropertyOptional({ description: 'Rich text content (for content_type=text)' })
  @IsOptional()
  @IsString()
  content_text?: string;

  @ApiPropertyOptional({ example: 'https://s3.example.com/materials/ch5.pdf' })
  @IsOptional()
  @IsString()
  file_url?: string;

  @ApiPropertyOptional({ example: 'PDF' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  file_type?: string;

  @ApiPropertyOptional({ example: 'https://www.youtube.com/watch?v=abc123' })
  @IsOptional()
  @IsUrl()
  youtube_url?: string;
}

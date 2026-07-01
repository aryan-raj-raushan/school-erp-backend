import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';

export class SyllabusAttachmentDto {
  @ApiProperty({ example: 'chapter1.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  file_name: string;

  @ApiProperty({ example: 'https://cdn.example.com/syllabus/chapter1.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  file_url: string;

  @ApiProperty({ example: 'pdf', description: 'jpg | png | pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  file_type: string;

  @ApiPropertyOptional({ example: '1.2MB' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  file_size?: string;
}

export class CreateSyllabusDto {
  @ApiProperty({ example: 'uuid-of-class' })
  @IsUUID()
  @IsNotEmpty()
  class_id: string;

  @ApiProperty({ example: 'Mathematics Syllabus Term 1', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }) => StringUtils.trim(value))
  title: string;

  @ApiPropertyOptional({ example: '<p>Chapter 1: Algebra...</p>' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;

  @ApiPropertyOptional({ type: [SyllabusAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyllabusAttachmentDto)
  attachments?: SyllabusAttachmentDto[];
}

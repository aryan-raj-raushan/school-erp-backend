import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';
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

  @ApiProperty({ example: 'https://s3.example.com/materials/ch5.pdf' })
  @IsString()
  @IsNotEmpty()
  file_url: string;

  @ApiPropertyOptional({ example: 'PDF' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  file_type?: string;
}

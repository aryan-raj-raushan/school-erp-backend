import { IsUUID, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassSubjectDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  class_section_id: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  subject_id: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_teaching_subject?: boolean;
}

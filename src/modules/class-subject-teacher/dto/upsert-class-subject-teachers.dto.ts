import { IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ClassSubjectTeacherItemDto {
  @ApiProperty({ example: 'uuid-of-subject' })
  @IsUUID()
  subject_id: string;

  @ApiProperty({ example: 'uuid-of-teacher' })
  @IsUUID()
  teacher_id: string;
}

export class UpsertClassSubjectTeachersDto {
  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  academic_year_id: string;

  @ApiProperty({ example: 'uuid-of-class' })
  @IsUUID()
  class_id: string;

  @ApiProperty({ type: [ClassSubjectTeacherItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassSubjectTeacherItemDto)
  mappings: ClassSubjectTeacherItemDto[];
}

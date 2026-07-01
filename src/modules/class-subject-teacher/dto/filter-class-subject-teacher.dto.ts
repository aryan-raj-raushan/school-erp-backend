import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FilterClassSubjectTeacherDto {
  @ApiProperty({ description: 'Academic year to scope the mapping to' })
  @IsUUID()
  academic_year_id: string;

  @ApiProperty({ description: 'Class to fetch the subject-teacher mapping for' })
  @IsUUID()
  class_id: string;
}

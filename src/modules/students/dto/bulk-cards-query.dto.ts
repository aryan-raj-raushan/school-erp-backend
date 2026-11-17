import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkCardsQueryDto {
  @ApiProperty()
  @IsUUID('all', { message: 'Select an academic year' })
  academic_year_id: string;

  @ApiProperty()
  @IsUUID('all', { message: 'Select a class' })
  class_id: string;

  @ApiPropertyOptional({ description: 'Leave empty for every section of the class' })
  @IsOptional()
  @IsUUID('all', { message: 'Invalid section' })
  section_id?: string;
}

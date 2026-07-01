import { IsOptional, IsUUID, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterTimetableDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() academic_year_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() class_id?: string;
  @ApiPropertyOptional({
    enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
  })
  @IsOptional()
  @IsString()
  day?: string;
}

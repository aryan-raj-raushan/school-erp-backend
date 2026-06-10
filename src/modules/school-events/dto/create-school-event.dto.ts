import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SchoolEventType } from '@shared/enums/holiday-events.enum';
import { REGEX } from '@utils/regex.utils';

export class CreateSchoolEventDto {
  @ApiProperty({ example: 'Republic Day' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: SchoolEventType })
  @IsEnum(SchoolEventType)
  type: SchoolEventType;

  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  academic_year_id: string;

  @ApiPropertyOptional({ example: 'National holiday' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2025-01-26' })
  @IsDateString()
  from_date: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(REGEX.TIME_REGEX, { message: 'from_time must be in HH:mm or HH:mm:ss format' })
  from_time?: string;

  @ApiProperty({ example: '2025-01-26' })
  @IsDateString()
  to_date: string;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  @Matches(REGEX.TIME_REGEX, { message: 'to_time must be in HH:mm or HH:mm:ss format' })
  to_time?: string;
}

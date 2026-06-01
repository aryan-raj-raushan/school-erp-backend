import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HolidayType } from '../../../shared/enums';
import { StringUtils } from '../../../utils/string.utils';

export class CreateHolidayDto {
  @ApiProperty({ example: 'Republic Day', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => StringUtils.trim(value))
  name: string;

  @ApiProperty({ example: '2025-01-26' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ enum: HolidayType, example: HolidayType.NATIONAL })
  @IsEnum(HolidayType)
  @IsNotEmpty()
  type: HolidayType;

  @ApiPropertyOptional({ example: 'National holiday celebrating Republic Day' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => StringUtils.trim(value))
  description?: string;

  @ApiPropertyOptional({ example: 'uuid-of-academic-year' })
  @IsOptional()
  @IsUUID()
  academic_year_id?: string;
}

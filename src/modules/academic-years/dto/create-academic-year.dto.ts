import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';

export class CreateAcademicYearDto {
  @ApiProperty({ example: '2024-25', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => StringUtils.trim(value))
  name: string;

  @ApiProperty({ example: '2024-04-01' })
  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @ApiProperty({ example: '2025-03-31' })
  @IsDateString()
  @IsNotEmpty()
  end_date: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_current?: boolean;
}

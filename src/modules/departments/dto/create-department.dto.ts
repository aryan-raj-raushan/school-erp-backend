import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Science', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  name: string;

  @ApiPropertyOptional({ example: 'SCI', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => StringUtils.trim(value))
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => StringUtils.trim(value))
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

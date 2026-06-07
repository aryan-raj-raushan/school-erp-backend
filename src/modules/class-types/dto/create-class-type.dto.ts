import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';

export class CreateClassTypeDto {
  @ApiProperty({ example: 'Regular', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => StringUtils.trim(value))
  name: string;

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

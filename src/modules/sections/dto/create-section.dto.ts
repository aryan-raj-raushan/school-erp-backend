import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';

export class CreateSectionDto {
  @ApiProperty({ example: 'A', maxLength: 10 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @Transform(({ value }) => StringUtils.trim(value))
  name: string;

  @ApiProperty({ example: 'uuid-of-class' })
  @IsUUID()
  @IsNotEmpty()
  class_id: string;

  @ApiPropertyOptional({ example: 'uuid-of-class-teacher' })
  @IsOptional()
  @IsUUID()
  class_teacher_id?: string;

  @ApiPropertyOptional({ example: 'Room 101', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => StringUtils.trim(value))
  room_number?: string;

  @ApiPropertyOptional({ example: 40, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  max_strength?: number;
}

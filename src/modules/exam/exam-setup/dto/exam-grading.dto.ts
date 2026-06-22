import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumberString,
  Min,
  MaxLength,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExamGradingDto {
  @ApiProperty({ example: 'A+' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  grade_name: string;

  @ApiProperty({ example: '90.00', description: 'Minimum percentage (inclusive)' })
  @IsNumberString()
  from_percentage: string;

  @ApiProperty({ example: '100.00', description: 'Maximum percentage (inclusive)' })
  @IsNumberString()
  to_percentage: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sequence_index?: number;

  @ApiPropertyOptional({ example: 'Excellent performance' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

export class UpdateExamGradingDto extends PartialType(CreateExamGradingDto) {}

import { IsString, IsNotEmpty, IsOptional, IsUUID, IsNumber, IsEnum, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';

export class CreateExamPolicyDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  exam_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => StringUtils.trim(value))
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  passing_marks?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  total_marks?: number;

  @ApiPropertyOptional({ enum: ['MARKS', 'GRADES', 'PERCENTAGE'] })
  @IsOptional()
  @IsEnum(['MARKS', 'GRADES', 'PERCENTAGE'])
  marking_system?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  grace_marks?: number;
}

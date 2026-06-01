import { IsNotEmpty, IsOptional, IsUUID, IsDateString, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExamTimetableDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  exam_id: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  class_section_id: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  subject_id: string;

  @ApiProperty({ example: '2025-10-05' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  start_time?: string;

  @ApiPropertyOptional({ example: '12:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  end_time?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  room_number?: string;
}

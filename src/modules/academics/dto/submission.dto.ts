import { IsEnum, IsOptional, IsString, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmissionEntryDto {
  @ApiProperty()
  @IsUUID()
  student_id: string;

  @ApiProperty({ enum: ['PENDING', 'SUBMITTED', 'GRADED', 'LATE'] })
  @IsEnum(['PENDING', 'SUBMITTED', 'GRADED', 'LATE'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class BulkMarkSubmissionsDto {
  @ApiProperty({ type: [SubmissionEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmissionEntryDto)
  submissions: SubmissionEntryDto[];
}

export class UpdateSubmissionDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'SUBMITTED', 'GRADED', 'LATE'] })
  @IsOptional()
  @IsEnum(['PENDING', 'SUBMITTED', 'GRADED', 'LATE'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  submission_url?: string;
}

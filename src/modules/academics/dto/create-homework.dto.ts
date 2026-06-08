import { IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString, IsBoolean, IsIn, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';

export class HomeworkAttachmentDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) file_name: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500) file_url: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(10) file_type: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) file_size?: string;
}

export class CreateHomeworkDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() academic_year_id: string;
  @ApiProperty() @IsUUID() @IsNotEmpty() class_id: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() class_detail_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() subject_id?: string;

  @ApiProperty({ example: 'Chapter 5 Exercise' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  @Transform(({ value }) => StringUtils.trim(value))
  title: string;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ example: '2025-06-15', description: 'Date homework is given' })
  @IsOptional() @IsDateString() homework_date?: string;

  @ApiProperty({ example: '2025-06-20', description: 'Date of submission (due date)' })
  @IsDateString() @IsNotEmpty() due_date: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'CLOSED'], default: 'ACTIVE' })
  @IsOptional() @IsIn(['DRAFT', 'ACTIVE', 'CLOSED']) status?: string;

  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() send_notification?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() student_upload_allowed?: boolean;

  @ApiPropertyOptional({ type: [HomeworkAttachmentDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => HomeworkAttachmentDto)
  attachments?: HomeworkAttachmentDto[];
}

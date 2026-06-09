import { IsOptional, IsEnum, IsUUID, IsString, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { EnquiryStatus } from '@shared/enums/admission.enum';



export class FilterAdmissionEnquiryDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'uuid-of-academic-year' })
  @IsOptional()
  @IsUUID()
  academic_year_id?: string;

  @ApiPropertyOptional({ example: 'uuid-of-class' })
  @IsOptional()
  @IsUUID()
  applying_class_id?: string;

  @ApiPropertyOptional({ enum: EnquiryStatus })
  @IsOptional()
  @IsEnum(EnquiryStatus)
  status?: EnquiryStatus;

  @ApiPropertyOptional({ example: 'uuid-of-teacher' })
  @IsOptional()
  @IsUUID()
  assigned_teacher_id?: string;

  @ApiPropertyOptional({ example: 'uuid-of-source' })
  @IsOptional()
  @IsUUID()
  enquiry_source_id?: string;

  @ApiPropertyOptional({ description: 'Search by student name or phone' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ example: '2025-09-01', description: 'Filter by next follow-up date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  next_followup_date?: string;
}
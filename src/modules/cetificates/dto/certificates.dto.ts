import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

// ─── Transfer Certificate ─────────────────────────────────────────────────────

export class CreateTransferCertificateDto {
  @ApiProperty({ description: 'Student ID' })
  @IsString()
  @IsNotEmpty()
  student_id: string;

  @ApiProperty({ description: 'Academic Year ID' })
  @IsString()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiProperty({ description: 'Class ID' })
  @IsString()
  @IsNotEmpty()
  class_id: string;

  @ApiPropertyOptional({ description: 'Section ID' })
  @IsString()
  @IsOptional()
  section_id?: string;

  @ApiProperty({ description: 'Whether candidate is qualified for higher class', example: 'YES' })
  @IsString()
  @IsIn(['YES', 'NO'])
  qualified_for_higher_class: string;

  @ApiProperty({ description: 'Date of leaving (DD/MM/YYYY)', example: '18/02/2022' })
  @IsString()
  @IsNotEmpty()
  leaving_date: string;

  @ApiProperty({ description: 'Total working days' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  total_working_days: number;

  @ApiProperty({ description: 'Total days present' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  total_present: number;

  @ApiPropertyOptional({ description: 'Extra activities (if any)' })
  @IsString()
  @IsOptional()
  extra_activities?: string;

  @ApiProperty({ description: 'Character of candidate during study period', example: 'GOOD' })
  @IsString()
  @IsNotEmpty()
  candidate_character: string;

  @ApiProperty({ description: 'Reason for leaving school', example: 'PARENT TRANSFER' })
  @IsString()
  @IsNotEmpty()
  leaving_reason: string;

  @ApiProperty({ description: 'Fees due amount or YES/NO', example: 'NO' })
  @IsString()
  @IsNotEmpty()
  fees_due: string;
}

export class TransferCertificateFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() academic_year_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() class_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() section_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() limit?: number = 20;
}

// ─── Bonafide Certificate ─────────────────────────────────────────────────────

export class CreateBonafideCertificateDto {
  @ApiProperty({ description: 'Student ID' })
  @IsString()
  @IsNotEmpty()
  student_id: string;

  @ApiProperty({ description: 'Academic Year ID' })
  @IsString()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiProperty({ description: 'Class ID' })
  @IsString()
  @IsNotEmpty()
  class_id: string;

  @ApiPropertyOptional({ description: 'Section ID' })
  @IsString()
  @IsOptional()
  section_id?: string;

  @ApiProperty({ description: 'Purpose of bonafide certificate', example: 'Bank Account Opening' })
  @IsString()
  @IsNotEmpty()
  purpose: string;
}

export class BonafideCertificateFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() academic_year_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() class_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() section_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() limit?: number = 20;
}
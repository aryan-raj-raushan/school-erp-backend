import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsNumberString,
  MaxLength,
  MinLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  BloodGroup,
  Category,
  DocumentFileType,
  DocumentType,
  Gender,
  ParentRelation,
  Qualification,
  Religion,
  StudentStatus,
} from '@shared/enums/student.enum';

// ─── Sub-DTOs ─────────────────────────────────────────────────────────────────

export class StudentAcademicInfoDto {
  @ApiProperty() @IsString() academic_year_id: string;
  @ApiProperty() @IsString() class_id: string;
  @ApiPropertyOptional() @IsOptional() @IsString() section_id?: string;
  @ApiProperty() @IsString() admission_number: string;
  @ApiPropertyOptional() @IsOptional() @IsString() registration_number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() roll_number?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() joining_date?: string;
}

export class StudentPreviousAcademicsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() previous_school_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() previous_class?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() passing_year?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() total_marks?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() grade?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() board?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tc_number?: string;
}

export class StudentAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pincode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
}

export class StudentHostelInfoDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hostel_required?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() hostel_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() room_number?: string;
}

export class StudentParentDto {
  @ApiPropertyOptional({ description: 'Existing parent row id — omit for new parents' })
  @IsOptional()
  @IsString()
  id?: string;
  @ApiProperty({ enum: ParentRelation }) @IsEnum(ParentRelation) relation: ParentRelation;
  @ApiProperty() @IsString() @MaxLength(100) first_name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) last_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dial_code?: string;
  @ApiProperty() @IsString() phone_number: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alternate_phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() occupation?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(Qualification) qualification?: Qualification;
  @ApiPropertyOptional() @IsOptional() @IsString() annual_income?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() aadhaar_number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() profile_image?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_primary?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() can_pickup?: boolean;
  @ApiPropertyOptional({ default: false, description: 'Enable portal login for this parent' })
  @IsOptional()
  @IsBoolean()
  enable_login?: boolean;
  @ApiPropertyOptional({
    example: 'Parent@123',
    description:
      'Required to enable login the first time; omit on later saves to keep the existing password',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

export class StudentDocumentDto {
  @ApiProperty({ enum: DocumentType }) @IsEnum(DocumentType) document_name: DocumentType;
  @ApiProperty({ enum: DocumentFileType }) @IsEnum(DocumentFileType) file_type: DocumentFileType;
  @ApiProperty() @IsString() document_link: string;
  @ApiPropertyOptional() @IsOptional() @IsString() original_filename?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

// ─── Main Create DTO ──────────────────────────────────────────────────────────

export class CreateStudentDto {
  // Onboarding link — set when this student is created from a confirmed admission enquiry
  @ApiPropertyOptional() @IsOptional() @IsString() admission_enquiry_id?: string;

  // Basic Info
  @ApiProperty() @IsString() @MaxLength(100) first_name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) last_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() date_of_birth?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(Gender) gender?: Gender;
  @ApiPropertyOptional() @IsOptional() @IsEnum(BloodGroup) blood_group?: BloodGroup;
  @ApiPropertyOptional() @IsOptional() @IsEnum(Religion) religion?: Religion;
  @ApiPropertyOptional() @IsOptional() @IsEnum(Category) category?: Category;
  @ApiPropertyOptional() @IsOptional() @IsString() caste?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(12) aadhaar_number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() id_card_number?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumberString() height_cm?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumberString() weight_kg?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() profile_image?: string;

  // Contact
  @ApiPropertyOptional() @IsOptional() @IsString() dial_code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone_number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;

  // Status
  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_enabled?: boolean;

  // Sub-sections
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => StudentAcademicInfoDto)
  academic_info?: StudentAcademicInfoDto;
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => StudentPreviousAcademicsDto)
  previous_academics?: StudentPreviousAcademicsDto;
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => StudentAddressDto)
  address?: StudentAddressDto;
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => StudentHostelInfoDto)
  hostel_info?: StudentHostelInfoDto;
  @ApiPropertyOptional({ type: [StudentParentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentParentDto)
  parents?: StudentParentDto[];
  @ApiPropertyOptional({ type: [StudentDocumentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentDocumentDto)
  documents?: StudentDocumentDto[];
}

export class UpdateStudentDto extends CreateStudentDto {}

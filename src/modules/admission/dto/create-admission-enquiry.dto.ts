import {
  IsString, IsOptional, IsBoolean, IsDateString, IsEnum,
  IsUUID, IsEmail, MaxLength, Matches, IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { REGEX } from '@utils/regex.utils';
import { CategoryEnum, GenderEnum, ReligionEnum } from '@shared/enums';




export class CreateAdmissionEnquiryDto {
  // Academic Year
  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  academic_year_id: string;

  // Basic / Parent Info
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150)
  father_name?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150)
  mother_name?: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: '+91' })
  @IsOptional()
  @IsString()
  dial_code?: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  father_occupation?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  mother_occupation?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  father_qualification?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  mother_qualification?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  city?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  state?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  country?: string;

  // Student Info
  @ApiProperty({ example: 'Ravi Kumar' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  student_name: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  date_of_birth?: string;

  @ApiPropertyOptional({ enum: GenderEnum }) @IsOptional() @IsEnum(GenderEnum)
  gender?: GenderEnum;

  @ApiPropertyOptional({ enum: ReligionEnum }) @IsOptional() @IsEnum(ReligionEnum)
  religion?: ReligionEnum;

  @ApiPropertyOptional({ enum: CategoryEnum }) @IsOptional() @IsEnum(CategoryEnum)
  category?: CategoryEnum;

  @ApiPropertyOptional() @IsOptional() @IsString()
  student_current_address?: string;

  // Admission Info
  @ApiProperty({ example: 'uuid-of-applying-academic-year' })
  @IsUUID()
  applying_academic_year_id: string;

  @ApiProperty({ example: 'uuid-of-class' })
  @IsUUID()
  applying_class_id: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300)
  previous_school_name?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  previous_class?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  registration_fee_required?: boolean;

  // Enquiry Info
  @ApiPropertyOptional({ example: 'uuid-of-teacher' })
  @IsOptional()
  @IsUUID()
  assigned_teacher_id?: string;

  @ApiPropertyOptional({ example: '2025-08-01' })
  @IsOptional()
  @IsDateString()
  next_followup_date?: string;

  @ApiPropertyOptional({ example: '10:00' })
  @IsOptional()
  @Matches(REGEX.TIME_REGEX, { message: 'next_followup_time must be HH:mm or HH:mm:ss' })
  next_followup_time?: string;

  @ApiPropertyOptional({ example: 'uuid-of-admission-source' })
  @IsOptional()
  @IsUUID()
  enquiry_source_id?: string;

  @ApiProperty({ example: 'Parent visited the school and inquired about Class 6 admission.' })
  @IsString()
  @IsNotEmpty()
  remarks: string;
}
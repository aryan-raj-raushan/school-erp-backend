import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { REGEX } from '../../../utils/regex.utils';
import { StringUtils } from '../../../utils/string.utils';
import { Gender, BloodGroup } from '../../../shared/enums/gender.enum';
import { StudentStatus } from '../../../shared/enums/status.enum';

export class CreateStudentDto {
  @ApiProperty({ example: 'Rahul' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.titleCase(StringUtils.trim(value)))
  first_name: string;

  @ApiPropertyOptional({ example: 'Sharma' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.titleCase(StringUtils.trim(value)))
  last_name?: string;

  @ApiProperty({ example: 'DPS/2024/00001' })
  @IsString()
  @IsNotEmpty()
  @Matches(REGEX.ADMISSION_NO, { message: 'Invalid admission number format' })
  @Transform(({ value }) => StringUtils.trim(value)?.toUpperCase())
  admission_number: string;

  @ApiPropertyOptional({ example: '42' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  roll_number?: string;

  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiProperty({ example: 'uuid-of-class' })
  @IsUUID()
  @IsNotEmpty()
  class_id: string;

  @ApiPropertyOptional({ example: 'uuid-of-section' })
  @IsOptional()
  @IsUUID()
  section_id?: string;

  @ApiPropertyOptional({ example: '2010-05-15' })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ enum: BloodGroup })
  @IsOptional()
  @IsEnum(BloodGroup)
  blood_group?: BloodGroup;

  @ApiPropertyOptional({ example: 'Hindu' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => StringUtils.trim(value))
  religion?: string;

  @ApiPropertyOptional({ example: 'General' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => StringUtils.trim(value))
  caste?: string;

  @ApiPropertyOptional({ example: 'Indian', default: 'Indian' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nationality?: string;

  @ApiPropertyOptional({ example: '123456789012' })
  @IsOptional()
  @Matches(REGEX.AADHAAR, { message: 'Aadhaar must be 12 digits' })
  aadhaar_number?: string;

  @ApiPropertyOptional({ example: '123 Main Street, Sector 5' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => StringUtils.sanitize(StringUtils.trim(value)))
  address?: string;

  @ApiPropertyOptional({ example: 'New Delhi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.titleCase(StringUtils.trim(value)))
  city?: string;

  @ApiPropertyOptional({ example: 'Delhi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.titleCase(StringUtils.trim(value)))
  state?: string;

  @ApiPropertyOptional({ example: '110001' })
  @IsOptional()
  @Matches(REGEX.PINCODE_IN, { message: 'Invalid Indian pincode' })
  pincode?: string;

  @ApiPropertyOptional({ example: '+91' })
  @IsOptional()
  @Matches(REGEX.DIAL_CODE, { message: 'Invalid dial code' })
  dial_code?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @Matches(REGEX.PHONE_IN, { message: 'Invalid Indian mobile number' })
  phone_number?: string;

  @ApiPropertyOptional({ example: 'rahul.sharma@example.com' })
  @IsOptional()
  @Matches(REGEX.EMAIL, { message: 'Invalid email address' })
  @Transform(({ value }) => StringUtils.trim(value)?.toLowerCase())
  email?: string;

  @ApiPropertyOptional({ example: '2024-04-01' })
  @IsOptional()
  @IsDateString()
  admission_date?: string;

  @ApiPropertyOptional({ enum: StudentStatus, default: StudentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;
}

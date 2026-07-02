import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsDateString,
  IsUUID,
  IsBoolean,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SchoolRole, Gender, BloodGroup } from '../../../shared/enums';
import { StringUtils } from '../../../utils/string.utils';
import { REGEX } from '../../../utils/regex.utils';

export class CreateStaffDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  first_name: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  last_name?: string;

  @ApiProperty({ example: '+91' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  dial_code: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  @Matches(REGEX.PHONE_IN, { message: 'Invalid phone number' })
  phone_number: string;

  @ApiPropertyOptional({ example: 'john.doe@school.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  email?: string;

  @ApiProperty({ enum: SchoolRole, example: SchoolRole.TEACHER })
  @IsEnum(SchoolRole)
  @IsNotEmpty()
  role: SchoolRole;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @ApiPropertyOptional({ enum: BloodGroup })
  @IsOptional()
  @IsEnum(BloodGroup)
  blood_group?: string;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => StringUtils.trim(value))
  address?: string;

  @ApiPropertyOptional({ example: '456 Home St' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => StringUtils.trim(value))
  permanent_address?: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  city?: string;

  @ApiPropertyOptional({ example: '2023-06-01' })
  @IsOptional()
  @IsDateString()
  joining_date?: string;

  @ApiPropertyOptional({ example: 'EMP-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => StringUtils.trim(value))
  employee_code?: string;

  @ApiPropertyOptional({ description: 'Custom role ID used as designation (UUID)' })
  @IsOptional()
  @IsUUID()
  custom_role_id?: string;

  @ApiPropertyOptional({ example: 'Ram Kumar' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  father_name?: string;

  @ApiPropertyOptional({ example: 'Suresh Kumar' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  husband_name?: string;

  @ApiPropertyOptional({ description: 'Reporting manager staff ID (UUID)' })
  @IsOptional()
  @IsUUID()
  reporting_to_id?: string;

  @ApiPropertyOptional({ example: 'RFID-12345' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => StringUtils.trim(value))
  rfid_card_number?: string;

  @ApiPropertyOptional({ example: 'M.Ed, B.Sc' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => StringUtils.trim(value))
  qualification?: string;

  @ApiPropertyOptional({ example: 'Delhi Public School' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => StringUtils.trim(value))
  previous_employer?: string;

  @ApiPropertyOptional({ example: 'Senior Teacher' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  previous_role?: string;

  @ApiPropertyOptional({ example: '5 years' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  total_experience?: string;

  @ApiPropertyOptional({ example: 'profile-image-s3-url' })
  @IsOptional()
  @IsString()
  profile_image?: string;

  @ApiPropertyOptional({ example: 'Secret@123', description: 'Initial login password' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the account is enabled' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

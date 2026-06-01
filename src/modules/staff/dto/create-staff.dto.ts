import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsDateString,
  MaxLength,
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => StringUtils.trim(value))
  address?: string;
}

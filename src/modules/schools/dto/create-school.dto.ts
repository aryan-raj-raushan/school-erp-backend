import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  Matches,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { REGEX } from '../../../utils/regex.utils';
import { StringUtils } from '../../../utils/string.utils';
import { BoardType, MarkingSystem } from '../../../shared/enums';

export class CreateSchoolDto {
  @ApiProperty({ example: 'Delhi Public School' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => StringUtils.sanitize(StringUtils.trim(value)))
  name: string;

  @ApiPropertyOptional({ example: 'DPS' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(REGEX.SCHOOL_CODE, { message: 'Code must be 2-10 uppercase alphanumeric chars' })
  @Transform(({ value }) => StringUtils.trim(value)?.toUpperCase())
  code?: string;

  @ApiPropertyOptional({ example: '+91' })
  @IsOptional()
  @Matches(REGEX.DIAL_CODE, { message: 'Invalid dial code' })
  dial_code?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @Matches(REGEX.PHONE_IN, { message: 'Invalid Indian mobile number' })
  contact_number?: string;

  @ApiPropertyOptional({ example: 'info@school.edu.in' })
  @IsOptional()
  @Matches(REGEX.EMAIL, { message: 'Invalid email address' })
  @Transform(({ value }) => StringUtils.trim(value)?.toLowerCase())
  email?: string;

  @ApiPropertyOptional({ example: 'https://school.edu.in' })
  @IsOptional()
  @Matches(REGEX.URL, { message: 'Invalid website URL' })
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => StringUtils.sanitize(StringUtils.trim(value)))
  address?: string;

  @ApiPropertyOptional({ example: 'New Delhi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.sanitize(StringUtils.titleCase(StringUtils.trim(value))))
  city?: string;

  @ApiPropertyOptional({ example: 'Delhi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.sanitize(StringUtils.titleCase(StringUtils.trim(value))))
  state?: string;

  @ApiPropertyOptional({ example: '110001' })
  @IsOptional()
  @Matches(REGEX.PINCODE_IN, { message: 'Invalid Indian pincode' })
  pincode?: string;

  @ApiPropertyOptional({ enum: BoardType })
  @IsOptional()
  @IsEnum(BoardType)
  board_type?: BoardType;

  @ApiPropertyOptional({ enum: MarkingSystem })
  @IsOptional()
  @IsEnum(MarkingSystem)
  marking_system?: MarkingSystem;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  // Auto-creates a SCHOOL_ADMIN without password when provided
  @ApiPropertyOptional({ example: 'Ramesh' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.titleCase(StringUtils.trim(value)))
  admin_first_name?: string;

  @ApiPropertyOptional({ example: 'Kumar' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.titleCase(StringUtils.trim(value)))
  admin_last_name?: string;

  @ApiPropertyOptional({ example: '+91' })
  @IsOptional()
  @Matches(REGEX.DIAL_CODE, { message: 'Invalid dial code' })
  admin_dial_code?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @Matches(REGEX.PHONE_IN, { message: 'Invalid mobile number' })
  admin_phone?: string;

  @ApiPropertyOptional({ example: 'admin@school.edu.in' })
  @IsOptional()
  @Matches(REGEX.EMAIL, { message: 'Invalid email address' })
  @Transform(({ value }) => StringUtils.trim(value)?.toLowerCase())
  admin_email?: string;
}

import { IsString, IsNotEmpty, IsOptional, Matches, MaxLength, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { REGEX } from '../../../utils/regex.utils';
import { StringUtils } from '../../../utils/string.utils';
import { BoardType, MarkingSystem } from '../../../shared/enums';

export class SchoolSignupDto {
  // School details
  @ApiProperty({ example: 'Delhi Public School' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => StringUtils.sanitize(StringUtils.trim(value)))
  school_name: string;

  @ApiPropertyOptional({ example: 'DPS01' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(REGEX.SCHOOL_CODE, { message: 'Code must be 2-10 uppercase alphanumeric chars' })
  @Transform(({ value }) => StringUtils.trim(value)?.toUpperCase())
  school_code?: string;

  @ApiPropertyOptional({ enum: BoardType })
  @IsOptional()
  @IsEnum(BoardType)
  board_type?: BoardType;

  @ApiPropertyOptional({ enum: MarkingSystem })
  @IsOptional()
  @IsEnum(MarkingSystem)
  marking_system?: MarkingSystem;

  // Admin (SCHOOL_ADMIN) details
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

  @ApiPropertyOptional({ example: '+91' })
  @IsOptional()
  @Matches(REGEX.DIAL_CODE, { message: 'Invalid dial code' })
  dial_code?: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(REGEX.PHONE_IN, { message: 'Invalid Indian mobile number' })
  phone_number: string;

  @ApiPropertyOptional({ example: 'admin@school.edu.in' })
  @IsOptional()
  @Matches(REGEX.EMAIL, { message: 'Invalid email' })
  @Transform(({ value }) => StringUtils.trim(value)?.toLowerCase())
  email?: string;

  @ApiProperty({ example: 'Admin@1234', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @Matches(REGEX.PASSWORD, {
    message: 'Password must be 8+ chars with uppercase, lowercase, number and special character',
  })
  password: string;
}

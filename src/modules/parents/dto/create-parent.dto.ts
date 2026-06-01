import { IsString, IsNotEmpty, IsOptional, IsEmail, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';
import { REGEX } from '../../../utils/regex.utils';

export class CreateParentDto {
  @ApiProperty({ example: 'Rakesh' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.titleCase(StringUtils.trim(value)))
  first_name: string;

  @ApiPropertyOptional({ example: 'Sharma' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  last_name?: string;

  @ApiProperty({ example: '+91' })
  @IsString()
  @IsNotEmpty()
  @Matches(REGEX.DIAL_CODE, { message: 'Invalid dial code' })
  dial_code: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(REGEX.PHONE_IN, { message: 'Invalid phone number' })
  phone_number: string;

  @ApiPropertyOptional({ example: 'rakesh@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  email?: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  occupation?: string;

  @ApiPropertyOptional({ example: '1200000' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  annual_income?: string;

  @ApiPropertyOptional({ example: '123456789012' })
  @IsOptional()
  @Matches(REGEX.AADHAAR, { message: 'Aadhaar must be 12 digits' })
  aadhaar_number?: string;
}

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { REGEX } from '../../../utils/regex.utils';
import { StringUtils } from '../../../utils/string.utils';
import { ParentRelation } from '../../../shared/enums/gender.enum';

export class CreateParentDto {
  @ApiProperty({ enum: ParentRelation })
  @IsEnum(ParentRelation)
  @IsNotEmpty()
  relation: ParentRelation;

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
  last_name?: string;

  @ApiPropertyOptional({ example: 'rakesh.sharma@example.com' })
  @IsOptional()
  @Matches(REGEX.EMAIL, { message: 'Invalid email address' })
  email?: string;

  @ApiProperty({ example: '+91' })
  @IsString()
  @IsNotEmpty()
  @Matches(REGEX.DIAL_CODE, { message: 'Invalid dial code' })
  dial_code: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(REGEX.PHONE_IN, { message: 'Invalid Indian mobile number' })
  phone_number: string;

  @ApiPropertyOptional({ example: '9876543211' })
  @IsOptional()
  @Matches(REGEX.PHONE_IN, { message: 'Invalid Indian mobile number' })
  alternate_phone?: string;

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

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  can_pickup?: boolean;
}

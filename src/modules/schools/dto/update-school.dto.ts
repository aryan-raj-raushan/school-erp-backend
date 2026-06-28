import { PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, MaxLength, Min, Max, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { StringUtils } from '../../../utils/string.utils';
import { REGEX } from '../../../utils/regex.utils';
import { CreateSchoolDto } from './create-school.dto';

export class UpdateSchoolDto extends PartialType(CreateSchoolDto) {
  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional({ example: '27050101101' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  udise_code?: string;

  @ApiPropertyOptional({ example: '530/2022' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  affiliation_number?: string;

  @ApiPropertyOptional({ example: 1995 })
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(new Date().getFullYear())
  established_year?: number;

  @ApiPropertyOptional({ example: 'Dr. Rajesh Kumar' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }) => StringUtils.sanitize(StringUtils.trim(value)))
  principal_name?: string;

  @ApiPropertyOptional({ example: 'principal@school.edu.in' })
  @IsOptional()
  @Matches(REGEX.EMAIL, { message: 'Invalid email address' })
  @Transform(({ value }) => StringUtils.trim(value)?.toLowerCase())
  principal_email?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @Matches(REGEX.PHONE_IN, { message: 'Invalid mobile number' })
  principal_phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo_url?: string;
}

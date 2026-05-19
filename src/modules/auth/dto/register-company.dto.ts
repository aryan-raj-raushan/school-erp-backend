import { IsString, IsNotEmpty, IsOptional, Matches, MaxLength, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { REGEX } from '../../../utils/regex.utils';
import { StringUtils } from '../../../utils/string.utils';
import { CompanyRole } from '../../../shared/enums';

export class RegisterCompanyDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.titleCase(StringUtils.trim(value)))
  first_name: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.titleCase(StringUtils.trim(value)))
  last_name?: string;

  @ApiProperty({ example: 'admin@company.com' })
  @IsString()
  @IsNotEmpty()
  @Matches(REGEX.EMAIL, { message: 'Invalid email address' })
  @Transform(({ value }) => StringUtils.trim(value)?.toLowerCase())
  email: string;

  @ApiProperty({ example: 'Admin@1234', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @Matches(REGEX.PASSWORD, {
    message:
      'Password must be 8+ chars with uppercase, lowercase, number and special character',
  })
  password: string;

  @ApiPropertyOptional({ enum: CompanyRole })
  @IsOptional()
  @IsEnum(CompanyRole)
  role?: CompanyRole;
}

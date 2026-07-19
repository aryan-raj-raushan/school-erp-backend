import { IsString, IsNotEmpty, IsOptional, IsEnum, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { REGEX } from '../../../utils/regex.utils';
import { StringUtils } from '../../../utils/string.utils';
import { CompanyRole } from '../../../shared/enums';

// SUPER_ADMIN cannot be assigned here — see ASSIGNABLE_COMPANY_ROLES in company-users.service.ts
export class CreateCompanyUserDto {
  @ApiProperty({ example: 'Ramesh' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.titleCase(StringUtils.trim(value)))
  first_name: string;

  @ApiPropertyOptional({ example: 'Kumar' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.titleCase(StringUtils.trim(value)))
  last_name?: string;

  @ApiProperty({ example: 'sales.ramesh@company.com' })
  @IsString()
  @Matches(REGEX.EMAIL, { message: 'Invalid email address' })
  @Transform(({ value }) => StringUtils.trim(value)?.toLowerCase())
  email: string;

  @ApiProperty({ example: 'Passw0rd!', minLength: 8 })
  @IsString()
  @Matches(REGEX.PASSWORD, {
    message: 'Password must be 8+ chars with uppercase, lowercase, number and special character',
  })
  password: string;

  @ApiProperty({ enum: CompanyRole, example: CompanyRole.SALES })
  @IsEnum(CompanyRole)
  role: CompanyRole;
}

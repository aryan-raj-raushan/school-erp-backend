import {
  IsUUID,
  ValidateIf,
  IsString,
  Matches,
  IsOptional,
  IsEnum,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { REGEX } from '../../../utils/regex.utils';
import { StringUtils } from '../../../utils/string.utils';
import { CompanyRole } from '../../../shared/enums';
import { PERSON_NAME_MESSAGE } from '../../../shared/constants';

export class UpdateCompanyUserDto {
  @ApiPropertyOptional({ example: 'Ramesh' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(REGEX.PERSON_NAME, { message: PERSON_NAME_MESSAGE })
  @Transform(({ value }) => StringUtils.titleCase(StringUtils.trim(value)))
  first_name?: string;

  @ApiPropertyOptional({ example: 'Kumar' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(REGEX.PERSON_NAME, { message: PERSON_NAME_MESSAGE })
  @Transform(({ value }) => StringUtils.titleCase(StringUtils.trim(value)) || undefined)
  last_name?: string;

  @ApiPropertyOptional({ example: 'sales.ramesh@company.com' })
  @IsOptional()
  @IsString()
  @Matches(REGEX.EMAIL, { message: 'Invalid email address' })
  @Transform(({ value }) => StringUtils.trim(value)?.toLowerCase())
  email?: string;

  @ApiPropertyOptional({ enum: CompanyRole, example: CompanyRole.SALES })
  @IsOptional()
  @IsEnum(CompanyRole)
  role?: CompanyRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description:
      'Custom platform role — when set, its permissions decide what this member can access',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('all', { message: 'Invalid role' })
  company_role_id?: string | null;
}

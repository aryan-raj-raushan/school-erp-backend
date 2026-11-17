import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ALL_PLATFORM_PERMISSIONS } from '../../../shared/constants/platform-permissions';
import { StringUtils } from '../../../utils/string.utils';

export class CreateCompanyRoleDto {
  @ApiProperty({ example: 'Accounts Executive' })
  @IsString()
  @IsNotEmpty({ message: 'Role name is required' })
  @MaxLength(60)
  @Transform(({ value }) => StringUtils.trim(value))
  name: string;

  @ApiPropertyOptional({ example: 'Raises invoices and approves payments' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => StringUtils.trim(value) || undefined)
  description?: string;

  @ApiProperty({ example: ['platform.schools.view', 'platform.billing.view'] })
  @IsArray()
  @ArrayUnique()
  @IsIn(ALL_PLATFORM_PERMISSIONS, { each: true, message: 'Unknown permission: $value' })
  permissions: string[];
}

export class UpdateCompanyRoleDto extends PartialType(CreateCompanyRoleDto) {}

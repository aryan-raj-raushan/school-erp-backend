import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BloodGroup, Gender } from '../../../shared/enums';
import { REGEX } from '../../../utils/regex.utils';
import { StringUtils } from '../../../utils/string.utils';

export class ConfirmProfileDto {
  @ApiProperty({ example: 'Ravi' })
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

  @ApiPropertyOptional({ example: 'ravi@example.com' })
  @IsOptional()
  @Matches(REGEX.EMAIL, { message: 'Invalid email address' })
  @Transform(({ value }) => StringUtils.trim(value)?.toLowerCase())
  email?: string;

  @ApiPropertyOptional({ enum: Gender, description: 'Staff only' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: string;

  @ApiPropertyOptional({ example: '1990-05-15', description: 'Staff only' })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @ApiPropertyOptional({ enum: BloodGroup, description: 'Staff only' })
  @IsOptional()
  @IsEnum(BloodGroup)
  blood_group?: string;

  @ApiPropertyOptional({ example: '12 MG Road', description: 'Staff only' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => StringUtils.sanitize(StringUtils.trim(value)))
  address?: string;

  @ApiPropertyOptional({ example: 'Patna', description: 'Staff only' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.sanitize(StringUtils.titleCase(StringUtils.trim(value))))
  city?: string;

  @ApiPropertyOptional({ example: '9876543211', description: 'Parents only' })
  @IsOptional()
  @Matches(REGEX.PHONE_IN, { message: 'Invalid mobile number' })
  alternate_phone?: string;

  @ApiPropertyOptional({ example: 'Engineer', description: 'Parents only' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.sanitize(StringUtils.trim(value)))
  occupation?: string;
}

import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { REGEX } from '../../../utils/regex.utils';
import { StringUtils } from '../../../utils/string.utils';

export class LoginSchoolDto {
  @ApiProperty({ example: '+91' })
  @IsString()
  @IsNotEmpty()
  @Matches(REGEX.DIAL_CODE, { message: 'Invalid dial code format (e.g. +91)' })
  dial_code: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => StringUtils.normalizePhone(StringUtils.trim(value)))
  phone_number: string;

  @ApiProperty({ example: 'Admin@1234' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

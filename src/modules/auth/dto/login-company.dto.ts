import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { REGEX } from '../../../utils/regex.utils';
import { StringUtils } from '../../../utils/string.utils';

export class LoginCompanyDto {
  @ApiProperty({ example: 'admin@company.com' })
  @IsString()
  @IsNotEmpty()
  @Matches(REGEX.EMAIL, { message: 'Invalid email address' })
  @Transform(({ value }) => StringUtils.trim(value)?.toLowerCase())
  email: string;

  @ApiProperty({ example: 'Admin@1234' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

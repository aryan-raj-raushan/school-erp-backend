import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { REGEX } from '../../../utils/regex.utils';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'change_token received from login response when must_change_password is true',
  })
  @IsString()
  @IsNotEmpty()
  change_token: string;

  @ApiProperty({ example: 'NewAdmin@1234', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @Matches(REGEX.PASSWORD, {
    message: 'Password must be 8+ chars with uppercase, lowercase, number and special character',
  })
  password: string;

  @ApiProperty({ example: 'NewAdmin@1234' })
  @IsString()
  @IsNotEmpty()
  confirm_password: string;
}

import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { REGEX } from '../../../utils/regex.utils';

export class SetupPasswordDto {
  @ApiProperty({ description: 'Setup token received from login response when no password is set' })
  @IsString()
  @IsNotEmpty()
  setup_token: string;

  @ApiProperty({ example: 'Admin@1234', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @Matches(REGEX.PASSWORD, {
    message: 'Password must be 8+ chars with uppercase, lowercase, number and special character',
  })
  password: string;

  @ApiProperty({ example: 'Admin@1234' })
  @IsString()
  @IsNotEmpty()
  confirm_password: string;
}

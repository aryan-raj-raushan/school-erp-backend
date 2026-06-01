import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';

export class LoginUnifiedDto {
  @ApiProperty({ example: 'saurabh@erp.com or 9876543210', description: 'Email address or phone number' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => StringUtils.trim(value))
  identifier: string;

  @ApiPropertyOptional({ example: '+91', description: 'Required when identifier is a phone number' })
  @IsString()
  @IsOptional()
  @Matches(/^\+\d{1,4}$/, { message: 'Invalid dial code format (e.g. +91)' })
  dial_code?: string;

  @ApiProperty({ example: 'Admin@1234' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

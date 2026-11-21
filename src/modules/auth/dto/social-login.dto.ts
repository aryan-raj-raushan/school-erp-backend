import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SocialLoginDto {
  @ApiProperty({ description: 'Clerk session token obtained after Google or Microsoft sign-in' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectPaymentDto {
  @ApiProperty({ example: 'Proof does not match the invoice amount' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

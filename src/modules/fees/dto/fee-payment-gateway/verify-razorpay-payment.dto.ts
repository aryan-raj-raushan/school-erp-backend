import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyRazorpayPaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razorpay_order_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razorpay_payment_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razorpay_signature: string;
}

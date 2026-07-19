import {
  IsNumber,
  IsPositive,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../../shared/enums';

export class SubmitPaymentDto {
  @ApiProperty({ example: 4999 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    enum: PaymentMethod,
    description: 'Manual methods only — use the Razorpay order flow for online payments',
  })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  // Uploaded beforehand via POST /uploads/document (reference_type: "invoice_payment")
  @ApiPropertyOptional({
    description: 'S3 URL of the payment proof, if any (QR/bank-transfer screenshot)',
  })
  @IsOptional()
  @IsUrl()
  proof_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  proof_s3_key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

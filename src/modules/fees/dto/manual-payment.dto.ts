import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMode } from '../../../shared/enums';

export class ManualPaymentDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: PaymentMode })
  @IsEnum(PaymentMode)
  @IsNotEmpty()
  payment_mode: PaymentMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transaction_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

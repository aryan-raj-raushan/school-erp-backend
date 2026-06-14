import { IsString, IsEnum, IsOptional, IsNumber, IsPositive, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateFeePaymentDto {
  @ApiProperty({ example: 1600 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: ['CASH', 'ONLINE', 'CHEQUE', 'DD', 'NEFT', 'UPI'] })
  @IsEnum(['CASH', 'ONLINE', 'CHEQUE', 'DD', 'NEFT', 'UPI'])
  payment_mode: string;

  @ApiPropertyOptional({
    description: 'Finance account to credit (required for finance auto-entry)',
  })
  @IsOptional()
  @IsString()
  to_account_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transaction_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bank_name?: string;

  @ApiProperty({ example: '2026-04-15' })
  @IsDateString()
  payment_date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}

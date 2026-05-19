import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  IsBoolean,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../../shared/enums';

export class CreatePaymentDto {
  @ApiProperty({ example: 4999 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string = 'INR';

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  gateway_payment_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  gateway_order_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  gateway_signature?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoice_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_manual?: boolean;
}

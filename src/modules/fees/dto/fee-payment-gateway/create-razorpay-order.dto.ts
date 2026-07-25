import { IsNumber, IsOptional, IsPositive } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRazorpayOrderDto {
  @ApiPropertyOptional({
    description: 'Amount to pay in rupees — defaults to the full remaining due on the bill',
    example: 1600,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount?: number;
}

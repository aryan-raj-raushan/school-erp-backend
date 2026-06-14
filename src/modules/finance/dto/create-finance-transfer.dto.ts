import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';

export class CreateFinanceTransferDto {
  @ApiProperty({ description: 'Source account ID' })
  @IsString()
  @IsNotEmpty()
  from_account_id: string;

  @ApiProperty({ description: 'Destination account ID' })
  @IsString()
  @IsNotEmpty()
  to_account_id: string;

  @ApiProperty({ example: 5000 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  date_of_transaction: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => StringUtils.trim(value))
  remarks?: string;
}

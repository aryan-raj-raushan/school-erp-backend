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

export class CreateFinanceIncomeDto {
  @ApiProperty({ description: 'Income head ID' })
  @IsString()
  @IsNotEmpty()
  income_head_id: string;

  @ApiProperty({ description: 'Account to credit' })
  @IsString()
  @IsNotEmpty()
  to_account_id: string;

  @ApiProperty({ example: 10000 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  date_of_income: string;

  @ApiPropertyOptional({ description: 'Student ID (optional)' })
  @IsOptional()
  @IsString()
  student_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => StringUtils.trim(value))
  remarks?: string;
}

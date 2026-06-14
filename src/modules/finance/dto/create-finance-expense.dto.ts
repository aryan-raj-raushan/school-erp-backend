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

export class CreateFinanceExpenseDto {
  @ApiProperty({ description: 'Expense head ID' })
  @IsString()
  @IsNotEmpty()
  expense_head_id: string;

  @ApiProperty({ description: 'Account to debit from' })
  @IsString()
  @IsNotEmpty()
  from_account_id: string;

  @ApiProperty({ example: 5000 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  total_amount: number;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  date_of_expense: string;

  @ApiPropertyOptional({ description: 'Employee ID (optional)' })
  @IsOptional()
  @IsString()
  employee_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => StringUtils.trim(value))
  remarks?: string;
}

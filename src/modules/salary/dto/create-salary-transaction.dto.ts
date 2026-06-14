import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SALARY_PAYMENT_MODES } from '../../../database/drizzle/schema/salary-transactions.schema';

export class CreateSalaryTransactionDto {
  @ApiProperty() @IsString() @IsNotEmpty() employee_id: string;
  @ApiProperty() @IsString() @IsNotEmpty() salary_month: string; // YYYY-MM
  @ApiProperty() @IsNumber() @IsPositive() total_amount: number;
  @ApiProperty({ enum: SALARY_PAYMENT_MODES }) @IsIn(SALARY_PAYMENT_MODES) payment_mode: string;
  @ApiProperty() @IsString() @IsNotEmpty() payment_release_date: string;
  @ApiProperty({ required: false, default: 0 }) @IsOptional() @IsNumber() deduction_amount?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() from_account_id?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() expense_head_id?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() remarks?: string;
}

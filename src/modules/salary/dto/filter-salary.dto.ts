import { IsOptional, IsString, IsInt, IsBoolean, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

export class FilterSalaryHeadDto {
  @IsOptional() @IsString() head_type?: string;

  @IsOptional()
  @IsBoolean()
  @ToBoolean()
  is_enabled?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class FilterSalaryTransactionDto {
  @IsOptional() @IsString() employee_id?: string;
  @IsOptional() @IsString() salary_month?: string;
  @IsOptional() @IsString() status?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}

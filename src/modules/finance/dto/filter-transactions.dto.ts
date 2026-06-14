import { IsInt, IsOptional, IsString, IsDateString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterTransactionsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  account_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  head_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  end_date?: string;
}

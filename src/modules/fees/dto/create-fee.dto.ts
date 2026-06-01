import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FeeItemDto {
  @ApiProperty()
  @IsUUID()
  fee_type_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fee_type_name: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount: number;
}

export class CreateFeeDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  student_id: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiProperty({ type: [FeeItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeItemDto)
  fee_items: FeeItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_amount?: number;

  @ApiPropertyOptional({ example: '2025-06-30' })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkCreateFeeDto {
  @ApiProperty({ type: [CreateFeeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFeeDto)
  fees: CreateFeeDto[];
}

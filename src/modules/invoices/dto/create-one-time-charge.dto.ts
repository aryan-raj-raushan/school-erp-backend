import {
  IsUUID,
  IsOptional,
  IsEnum,
  IsString,
  MaxLength,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OneTimeChargeType } from '../../../shared/enums';

export class CreateOneTimeChargeDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  school_id: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  subscription_id?: string;

  @ApiProperty({ enum: OneTimeChargeType })
  @IsEnum(OneTimeChargeType)
  charge_type: OneTimeChargeType;

  @ApiPropertyOptional({ example: 'RFID reader — Block A' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Number of units, e.g. RFID devices, being charged for',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;
}

import { IsUUID, IsOptional, IsBoolean, IsNumber, IsPositive, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OneTimeChargeType } from '../../../shared/enums';

export class AssignRfidDeviceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  school_id: string;

  // When true, a one-time charge is created and immediately invoiced for this assignment.
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  billable?: boolean;

  @ApiPropertyOptional({ enum: OneTimeChargeType, default: OneTimeChargeType.RFID_DEVICE })
  @IsOptional()
  @IsEnum(OneTimeChargeType)
  charge_type?: OneTimeChargeType;

  // Required when billable = true
  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  charge_amount?: number;
}

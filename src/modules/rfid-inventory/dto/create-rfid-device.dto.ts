import { IsString, IsNotEmpty, IsOptional, MaxLength, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRfidDeviceDto {
  @ApiProperty({ example: 'RFID-A1B2C3' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  device_identifier: string;

  @ApiPropertyOptional({ example: 'ZKTeco K40' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  device_model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  purchase_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  warranty_expiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

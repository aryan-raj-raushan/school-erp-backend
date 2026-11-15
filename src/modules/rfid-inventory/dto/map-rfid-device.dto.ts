import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { StringUtils } from '../../../utils/string.utils';
import { AssignRfidDeviceDto } from './assign-rfid-device.dto';

export class MapRfidDeviceDto extends AssignRfidDeviceDto {
  @ApiProperty({ example: 'RFID-A1B2C3' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => StringUtils.trim(value))
  device_identifier: string;

  @ApiPropertyOptional({ example: 'ZKTeco K40' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  device_model?: string;
}

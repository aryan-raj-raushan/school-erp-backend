import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateRfidDeviceDto } from './create-rfid-device.dto';
import { RfidDeviceStatus } from '../../../shared/enums';

export class UpdateRfidDeviceDto extends PartialType(CreateRfidDeviceDto) {
  @ApiPropertyOptional({ enum: RfidDeviceStatus })
  @IsOptional()
  @IsEnum(RfidDeviceStatus)
  status?: RfidDeviceStatus;
}

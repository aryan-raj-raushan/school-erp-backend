import { PartialType } from '@nestjs/swagger';
import { CreateRfidDeviceDto } from './create-rfid-device.dto';

export class UpdateRfidDeviceDto extends PartialType(CreateRfidDeviceDto) {}

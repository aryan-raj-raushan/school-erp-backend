import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { RfidDeviceStatus } from '../../../shared/enums';

export class RfidDeviceFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ enum: RfidDeviceStatus })
  @IsOptional()
  @IsEnum(RfidDeviceStatus)
  status?: RfidDeviceStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  school_id?: string;
}

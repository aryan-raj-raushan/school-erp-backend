import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { StringUtils } from '../../../../utils/string.utils';

export class UpdateTransportRouteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => StringUtils.trim(value))
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

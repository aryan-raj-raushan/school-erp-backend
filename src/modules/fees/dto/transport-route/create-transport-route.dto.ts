import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { StringUtils } from '../../../../utils/string.utils';

export class CreateTransportRouteDto {
  @ApiProperty({ example: 'School to Bazar Samiti' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => StringUtils.trim(value))
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

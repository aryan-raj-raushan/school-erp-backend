import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RouteFeeItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fee_type_id: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

export class UpsertRouteFeeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiProperty({ type: [RouteFeeItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteFeeItemDto)
  items: RouteFeeItemDto[];
}

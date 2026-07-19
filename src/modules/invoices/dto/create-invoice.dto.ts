import {
  IsUUID,
  IsOptional,
  IsDateString,
  IsString,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddLineItemDto } from './add-line-item.dto';

export class CreateInvoiceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  subscription_id: string;

  @ApiPropertyOptional({ description: 'Defaults to 15 days from now' })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  // Ad-hoc add-ons bundled into this invoice alongside the auto-computed
  // subscription charge and any pending one-time charges.
  @ApiPropertyOptional({ type: [AddLineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddLineItemDto)
  extra_items?: AddLineItemDto[];
}

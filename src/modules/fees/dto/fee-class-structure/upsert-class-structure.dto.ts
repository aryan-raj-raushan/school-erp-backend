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

export class ClassStructureItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fee_type_id: string;

  @ApiProperty({ example: 1600 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

export class UpsertClassStructureDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fee_plan_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  class_id: string;

  @ApiProperty({ type: [ClassStructureItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassStructureItemDto)
  items: ClassStructureItemDto[];
}

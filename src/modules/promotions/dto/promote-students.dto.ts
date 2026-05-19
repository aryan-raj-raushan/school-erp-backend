import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StringUtils } from '../../../utils/string.utils';

export class PromotionItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  student_id: string;

  @ApiProperty({ format: 'uuid', description: 'Target class ID in the new academic year' })
  @IsUUID()
  @IsNotEmpty()
  to_class_id: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  to_section_id?: string;

  @ApiPropertyOptional({ example: '42' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => StringUtils.trim(value))
  to_roll_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => StringUtils.trim(value))
  remarks?: string;
}

export class PromoteStudentsDto {
  @ApiProperty({ format: 'uuid', description: 'Source academic year' })
  @IsUUID()
  @IsNotEmpty()
  from_academic_year_id: string;

  @ApiProperty({ format: 'uuid', description: 'Target academic year' })
  @IsUUID()
  @IsNotEmpty()
  to_academic_year_id: string;

  @ApiProperty({ type: [PromotionItemDto], maxItems: 500 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => PromotionItemDto)
  promotions: PromotionItemDto[];
}

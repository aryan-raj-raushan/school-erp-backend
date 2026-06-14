import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SalaryTemplateItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() salary_head_id: string;
  @ApiProperty() @IsOptional() default_amount?: number;
}

export class CreateSalaryTemplateDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() is_enabled?: boolean;
  @ApiProperty({ type: [SalaryTemplateItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalaryTemplateItemDto)
  items: SalaryTemplateItemDto[];
}

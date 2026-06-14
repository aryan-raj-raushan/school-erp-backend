import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SalaryTemplateItemDto } from './create-salary-template.dto';

export class UpdateSalaryTemplateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() is_enabled?: boolean;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalaryTemplateItemDto)
  items?: SalaryTemplateItemDto[];
}

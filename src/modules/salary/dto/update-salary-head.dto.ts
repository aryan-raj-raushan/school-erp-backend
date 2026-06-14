import { IsString, IsIn, IsOptional, IsBoolean } from 'class-validator';
import { SALARY_HEAD_TYPES } from '../../../database/drizzle/schema/salary-heads.schema';

export class UpdateSalaryHeadDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsIn(SALARY_HEAD_TYPES) head_type?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsBoolean() is_enabled?: boolean;
}

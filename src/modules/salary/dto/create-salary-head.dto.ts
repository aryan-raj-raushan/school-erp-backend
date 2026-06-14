import { IsString, IsNotEmpty, IsIn, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SALARY_HEAD_TYPES } from '../../../database/drizzle/schema/salary-heads.schema';

export class CreateSalaryHeadDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty({ enum: SALARY_HEAD_TYPES }) @IsIn(SALARY_HEAD_TYPES) head_type: string;
  @ApiProperty() @IsString() @IsNotEmpty() code: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() is_enabled?: boolean;
}

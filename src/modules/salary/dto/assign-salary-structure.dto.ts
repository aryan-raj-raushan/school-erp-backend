import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignSalaryStructureDto {
  @ApiProperty() @IsString() @IsNotEmpty() employee_id: string;
  @ApiProperty() @IsString() @IsNotEmpty() template_id: string;
  @ApiProperty() @IsString() @IsNotEmpty() effective_from: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() remarks?: string;
}

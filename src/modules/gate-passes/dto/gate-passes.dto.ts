import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGatePassDto {
  @ApiProperty() @IsString() student_id: string;
  @ApiProperty() @IsDateString() date: string;
  @ApiProperty() @IsString() reason: string;
  @ApiPropertyOptional() @IsOptional() @IsString() exit_time?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() return_time?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() parent_consent_required?: boolean;
}

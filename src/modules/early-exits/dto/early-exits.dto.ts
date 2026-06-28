import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EarlyExitReason {
  MEDICAL = 'MEDICAL',
  PARENT_PICKUP = 'PARENT_PICKUP',
  EMERGENCY = 'EMERGENCY',
  OFFICIAL = 'OFFICIAL',
  OTHER = 'OTHER',
}

export class CreateEarlyExitDto {
  @ApiProperty() @IsString() student_id: string;
  @ApiProperty() @IsDateString() date: string;
  @ApiProperty() @IsString() exit_time: string;
  @ApiProperty({ enum: EarlyExitReason }) @IsEnum(EarlyExitReason) reason: EarlyExitReason;
  @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string;
}

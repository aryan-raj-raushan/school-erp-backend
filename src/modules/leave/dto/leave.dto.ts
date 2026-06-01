import {
  IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString, IsBoolean,
  IsInt, IsEnum, IsArray, ValidateNested, MaxLength, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { LeaveRequestStatus } from '../../../shared/enums';

export class CreateLeaveTypeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  max_days: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_paid?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateLeavePolicyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [CreateLeaveTypeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLeaveTypeDto)
  leave_types: CreateLeaveTypeDto[];
}

export class UpdateLeavePolicyDto extends PartialType(CreateLeavePolicyDto) {}

export class UpdateLeaveTypeDto extends PartialType(CreateLeaveTypeDto) {}

export class ApplyTeacherLeaveDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  leave_type_id: string;

  @ApiProperty({ example: '2025-06-10' })
  @IsDateString()
  from_date: string;

  @ApiProperty({ example: '2025-06-12' })
  @IsDateString()
  to_date: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ReviewLeaveDto {
  @ApiProperty({ enum: [LeaveRequestStatus.APPROVED, LeaveRequestStatus.REJECTED] })
  @IsEnum([LeaveRequestStatus.APPROVED, LeaveRequestStatus.REJECTED])
  status: LeaveRequestStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewer_remarks?: string;
}

export class ApplyStudentLeaveDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  student_id: string;

  @ApiProperty({ example: '2025-06-10' })
  @IsDateString()
  from_date: string;

  @ApiProperty({ example: '2025-06-12' })
  @IsDateString()
  to_date: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

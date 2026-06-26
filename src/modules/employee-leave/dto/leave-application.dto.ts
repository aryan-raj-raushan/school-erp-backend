import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import { LeaveApplicationStatus } from '../leave.enum';

// ─── Apply Leave ──────────────────────────────────────────────────────────────
export class ApplyLeaveDto {
  @ApiProperty({ example: 'uuid-of-leave-type' })
  @IsUUID()
  leave_type_id: string;

  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  academic_year_id: string;

  @ApiProperty({ example: '2025-07-01', description: 'Start date in YYYY-MM-DD format' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ example: '2025-07-03', description: 'End date in YYYY-MM-DD format' })
  @IsDateString()
  end_date: string;

  @ApiPropertyOptional({ example: 'Family function', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

// ─── Approve / Reject Leave ───────────────────────────────────────────────────
export class ReviewLeaveDto {
  @ApiProperty({ enum: [LeaveApplicationStatus.APPROVED, LeaveApplicationStatus.REJECTED] })
  @IsEnum([LeaveApplicationStatus.APPROVED, LeaveApplicationStatus.REJECTED])
  status: LeaveApplicationStatus.APPROVED | LeaveApplicationStatus.REJECTED;

  @ApiPropertyOptional({ example: 'Approved as per policy', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}

// ─── Filter Leave Applications ────────────────────────────────────────────────
export class FilterLeaveApplicationDto {
  @ApiPropertyOptional({ example: 'uuid-of-employee' })
  @IsOptional()
  @IsUUID()
  employee_id?: string;

  @ApiPropertyOptional({ example: 'uuid-of-academic-year' })
  @IsOptional()
  @IsUUID()
  academic_year_id?: string;

  @ApiPropertyOptional({ example: 'uuid-of-leave-type' })
  @IsOptional()
  @IsUUID()
  leave_type_id?: string;

  @ApiPropertyOptional({ enum: LeaveApplicationStatus })
  @IsOptional()
  @IsEnum(LeaveApplicationStatus)
  status?: LeaveApplicationStatus;

  @ApiPropertyOptional({ example: '2025-07-01' })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiPropertyOptional({ example: '2025-07-31' })
  @IsOptional()
  @IsDateString()
  to_date?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

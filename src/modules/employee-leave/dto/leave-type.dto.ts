import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsEnum, IsInt, IsBoolean, IsOptional, MaxLength, Min } from 'class-validator';
import { LeaveValidity, LeavePayType } from '../leave.enum';

// ─── Create Leave Type ────────────────────────────────────────────────────────
export class CreateLeaveTypeDto {
  @ApiProperty({ example: 'Casual Leave' })
  @IsString()
  @MaxLength(100)
  leave_name: string;

  @ApiProperty({ enum: LeaveValidity, example: LeaveValidity.YEARLY })
  @IsEnum(LeaveValidity)
  leave_validity: LeaveValidity;

  @ApiProperty({ enum: LeavePayType, example: LeavePayType.PAID })
  @IsEnum(LeavePayType)
  leave_pay_type: LeavePayType;

  @ApiProperty({ example: 12, description: 'Number of days allowed per validity cycle' })
  @IsInt()
  @Min(1)
  leave_count_days: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

// ─── Update Leave Type ────────────────────────────────────────────────────────
export class UpdateLeaveTypeDto extends PartialType(CreateLeaveTypeDto) {}

// ─── Filter Leave Type ────────────────────────────────────────────────────────
export class FilterLeaveTypeDto {
  @ApiPropertyOptional({ enum: LeaveValidity })
  @IsOptional()
  @IsEnum(LeaveValidity)
  leave_validity?: LeaveValidity;

  @ApiPropertyOptional({ enum: LeavePayType })
  @IsOptional()
  @IsEnum(LeavePayType)
  leave_pay_type?: LeavePayType;

  @ApiPropertyOptional({ example: true, description: 'Filter by enabled status' })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;

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

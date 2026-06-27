import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

/**
 * Used by POST /leave-applications/admin-apply
 * Differs from ApplyLeaveDto in that it accepts an explicit employee_id —
 * allowing an admin to apply leave on behalf of any employee (or themselves).
 */
export class AdminApplyLeaveDto {
  @ApiProperty({
    example: 'uuid-of-employee',
    description: 'The employee for whom the leave is being applied',
  })
  @IsUUID()
  employee_id: string;

  @ApiProperty({ example: 'uuid-of-leave-type' })
  @IsUUID()
  leave_type_id: string;

  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  academic_year_id: string;

  @ApiProperty({ example: '2025-07-01', description: 'Start date YYYY-MM-DD' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ example: '2025-07-03', description: 'End date YYYY-MM-DD' })
  @IsDateString()
  end_date: string;

  @ApiPropertyOptional({ example: 'Medical emergency', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsInt, Min } from 'class-validator';

// ─── Assign Leave to Employee ─────────────────────────────────────────────────
export class AssignLeaveDto {
  @ApiProperty({ example: 'uuid-of-employee' })
  @IsUUID()
  employee_id: string;

  @ApiProperty({ example: 'uuid-of-leave-type' })
  @IsUUID()
  leave_type_id: string;

  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  academic_year_id: string;
}

// ─── Filter Assigned Leaves ───────────────────────────────────────────────────
export class FilterAssignedLeaveDto {
  @ApiPropertyOptional({ example: 'uuid-of-academic-year' })
  @IsOptional()
  @IsUUID()
  academic_year_id?: string;

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

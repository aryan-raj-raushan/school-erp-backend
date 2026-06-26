import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsInt, Min } from 'class-validator';

// ─── Body DTO (no employee_id — comes from path param) ───────────────────────
export class AssignLeaveBodyDto {
  @ApiProperty({ example: 'uuid-of-leave-type' })
  @IsUUID()
  leave_type_id: string;

  @ApiProperty({ example: 'uuid-of-academic-year' })
  @IsUUID()
  academic_year_id: string;
}

// ─── Full DTO used by service (employee_id merged from path) ──────────────────
export class AssignLeaveDto extends AssignLeaveBodyDto {
  employee_id: string;
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

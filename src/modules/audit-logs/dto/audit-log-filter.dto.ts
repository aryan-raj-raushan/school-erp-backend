import { IsOptional, IsIn, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import {
  auditActionEnum,
  auditEntityEnum,
} from '../../../database/drizzle/schema/audit-logs.schema';

type AuditEntity = (typeof auditEntityEnum.enumValues)[number];
type AuditAction = (typeof auditActionEnum.enumValues)[number];

export class AuditLogFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: auditEntityEnum.enumValues })
  @IsOptional()
  @IsIn(auditEntityEnum.enumValues)
  entity?: AuditEntity;

  @ApiPropertyOptional({ enum: auditActionEnum.enumValues })
  @IsOptional()
  @IsIn(auditActionEnum.enumValues)
  action?: AuditAction;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  changed_by?: string;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

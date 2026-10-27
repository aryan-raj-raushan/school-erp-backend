import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { oneTimeChargeStatusEnum } from '../../../database/drizzle/schema/subscription-one-time-charges.schema';

export class OneTimeChargeFilterDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  school_id?: string;

  @ApiPropertyOptional({ enum: oneTimeChargeStatusEnum.enumValues })
  @IsOptional()
  @IsIn(oneTimeChargeStatusEnum.enumValues)
  status?: (typeof oneTimeChargeStatusEnum.enumValues)[number];
}

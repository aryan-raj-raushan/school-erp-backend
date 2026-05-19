import { IsOptional, IsUUID, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dto/pagination.dto';

export class SubscriptionFilterDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  school_id?: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}

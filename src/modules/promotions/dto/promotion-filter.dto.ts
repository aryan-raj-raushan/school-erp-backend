import { IsOptional, IsUUID, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { PromotionStatus } from '../../../shared/enums';

export class PromotionFilterDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  student_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  from_academic_year_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  to_academic_year_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  batch_id?: string;

  @ApiPropertyOptional({ enum: PromotionStatus })
  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;
}

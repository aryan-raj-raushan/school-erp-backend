import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { BillingModel } from '../../../shared/enums';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

export class SubscriptionPlanFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ enum: BillingModel })
  @IsOptional()
  @IsEnum(BillingModel)
  billing_model?: BillingModel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @ToBoolean()
  is_active?: boolean;
}

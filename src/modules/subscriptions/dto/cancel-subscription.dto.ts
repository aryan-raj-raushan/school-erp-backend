import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelSubscriptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  cancellation_reason?: string;
}

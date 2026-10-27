import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  notificationChannelEnum,
  notificationEventEnum,
} from '../../../database/drizzle/schema/notification-rules.schema';

type NotificationEvent = (typeof notificationEventEnum.enumValues)[number];
type NotificationChannel = (typeof notificationChannelEnum.enumValues)[number];

export class UpsertNotificationRuleDto {
  @ApiProperty({ enum: notificationEventEnum.enumValues })
  @IsIn(notificationEventEnum.enumValues)
  event_type: NotificationEvent;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notify_parent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notify_student?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notify_teacher?: boolean;

  @ApiPropertyOptional({ enum: notificationChannelEnum.enumValues })
  @IsOptional()
  @IsIn(notificationChannelEnum.enumValues)
  channel?: NotificationChannel;

  @ApiPropertyOptional({ minimum: 0, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  delay_minutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

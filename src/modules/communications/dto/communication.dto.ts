import { IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class SendNotificationDto {
  @ApiProperty({ example: 'Exam Notice' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Specific recipient user ID' })
  @IsOptional()
  @IsUUID()
  recipient_id?: string;

  @ApiPropertyOptional({ description: 'Broadcast to a role group' })
  @IsOptional()
  @IsString()
  recipient_role?: string;
}

export class SendCommunicationDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  recipient_id: string;

  @ApiProperty({ enum: ['GENERAL', 'REQUEST', 'COMPLAINT', 'FEEDBACK', 'ANNOUNCEMENT'] })
  @IsEnum(['GENERAL', 'REQUEST', 'COMPLAINT', 'FEEDBACK', 'ANNOUNCEMENT'])
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'Regarding fee payment' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class ReviewCommunicationDto {
  @ApiPropertyOptional({ enum: ['APPROVED', 'REJECTED', 'REPLIED'] })
  @IsOptional()
  @IsEnum(['APPROVED', 'REJECTED', 'REPLIED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reply?: string;
}

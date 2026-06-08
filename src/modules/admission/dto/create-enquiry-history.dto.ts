import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export enum EnquiryAction {
  NEW_ENQUIRY = 'NEW_ENQUIRY',
  NEXT_FOLLOW_UP_UPDATE = 'NEXT_FOLLOW_UP_UPDATE',
  ADMISSION_CONFIRMED = 'ADMISSION_CONFIRMED',
  ENQUIRY_REJECTED = 'ENQUIRY_REJECTED',
  // REMARKS_UPDATED = 'REMARKS_UPDATED',
  // TEACHER_ASSIGNED = 'TEACHER_ASSIGNED',
}

export class CreateEnquiryHistoryDto {
  @ApiProperty({ enum: EnquiryAction })
  @IsEnum(EnquiryAction)
  action: EnquiryAction;

  @ApiPropertyOptional({ example: '2025-09-01' })
  @IsOptional()
  @IsDateString()
  next_followup_date?: string;

  @ApiPropertyOptional({ example: '10:30' })
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'next_followup_time must be HH:mm or HH:mm:ss' })
  next_followup_time?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  details?: string;

  @ApiProperty({ example: 'Called parent, interested in Class 6 admission.' })
  @IsString()
  @IsNotEmpty()
  remarks: string;
}
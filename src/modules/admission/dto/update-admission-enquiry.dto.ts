import { PartialType } from '@nestjs/swagger';
import { CreateAdmissionEnquiryDto } from './create-admission-enquiry.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum EnquiryStatus {
  NEW = 'NEW',
  FOLLOW_UP = 'FOLLOW_UP',
  ADMISSION_CONFIRMED = 'ADMISSION_CONFIRMED',
  REJECTED = 'REJECTED',
}

export class UpdateAdmissionEnquiryDto extends PartialType(CreateAdmissionEnquiryDto) {
  @ApiPropertyOptional({ enum: EnquiryStatus })
  @IsOptional()
  @IsEnum(EnquiryStatus)
  status?: EnquiryStatus;
}
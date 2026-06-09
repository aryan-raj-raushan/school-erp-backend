import { PartialType } from '@nestjs/swagger';
import { CreateAdmissionEnquiryDto } from './create-admission-enquiry.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EnquiryStatus } from '@shared/enums/admission.enum';



export class UpdateAdmissionEnquiryDto extends PartialType(CreateAdmissionEnquiryDto) {
  @ApiPropertyOptional({ enum: EnquiryStatus })
  @IsOptional()
  @IsEnum(EnquiryStatus)
  status?: EnquiryStatus;
}
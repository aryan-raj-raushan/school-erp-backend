import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnquiryAction } from '@shared/enums/admission.enum';
import { REGEX } from '@utils/regex.utils';

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
  @Matches(REGEX.TIME_REGEX, { message: 'next_followup_time must be HH:mm or HH:mm:ss' })
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

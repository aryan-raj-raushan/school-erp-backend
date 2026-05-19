import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { Gender } from '../../../shared/enums/gender.enum';
import { StudentStatus } from '../../../shared/enums/status.enum';

export class StudentFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by first name, last name, or admission number' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ example: 'uuid-of-class' })
  @IsOptional()
  @IsUUID()
  class_id?: string;

  @ApiPropertyOptional({ example: 'uuid-of-section' })
  @IsOptional()
  @IsUUID()
  section_id?: string;

  @ApiPropertyOptional({ example: 'uuid-of-academic-year' })
  @IsOptional()
  @IsUUID()
  academic_year_id?: string;

  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}

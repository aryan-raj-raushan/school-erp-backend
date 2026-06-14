import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FilterClassStructureDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academic_year_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fee_plan_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  class_id: string;
}

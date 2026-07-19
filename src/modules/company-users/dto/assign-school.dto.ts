import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignSchoolDto {
  @ApiProperty({ example: 'b3f1c2e4-...' })
  @IsUUID()
  school_id: string;
}

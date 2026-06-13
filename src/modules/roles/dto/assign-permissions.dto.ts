import { IsArray, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPermissionsDto {
  @ApiProperty({ type: [String], description: 'Array of permission IDs to assign to this role' })
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  permission_ids: string[];
}

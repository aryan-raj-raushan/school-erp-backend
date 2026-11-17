import { Equals, IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteSchoolDto {
  @ApiProperty({
    example: 'Delhi Public School',
    description: 'Must match the school name exactly',
  })
  @IsString()
  @IsNotEmpty({ message: 'Type the school name to confirm deletion' })
  @MaxLength(150)
  confirm_name: string;

  @ApiProperty({ example: true, description: 'Caller confirms a backup of the school was taken' })
  @IsBoolean()
  @Equals(true, {
    message: 'Confirm that you have taken a backup of this school before deleting it',
  })
  backup_confirmed: boolean;
}

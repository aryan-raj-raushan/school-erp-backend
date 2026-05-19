import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteUploadDto {
  @ApiProperty({ description: 'S3 object key to delete', example: 'schoolId/images/uuid.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  s3Key: string;
}

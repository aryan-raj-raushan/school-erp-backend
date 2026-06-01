import { IsNotEmpty, IsUUID, IsString, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExamRoomDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  exam_id: string;

  @ApiProperty({ example: 'Hall A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  room_name: string;

  @ApiProperty({ example: 40 })
  @IsInt()
  @Min(1)
  capacity: number;
}

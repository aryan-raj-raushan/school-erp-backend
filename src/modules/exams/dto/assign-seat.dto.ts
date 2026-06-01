import { IsNotEmpty, IsUUID, IsString, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignSeatDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  exam_id: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  exam_room_id: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  student_id: string;

  @ApiProperty({ example: 'A-01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  seat_number: string;

  @ApiProperty({ example: '2025-10-05' })
  @IsDateString()
  @IsNotEmpty()
  date: string;
}

export class AutoGenerateSeatingDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  exam_id: string;

  @ApiProperty({ example: '2025-10-05' })
  @IsDateString()
  @IsNotEmpty()
  date: string;
}

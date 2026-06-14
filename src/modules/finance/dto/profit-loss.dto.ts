import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProfitLossDto {
  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ example: '2024-12-31' })
  @IsDateString()
  end_date: string;
}

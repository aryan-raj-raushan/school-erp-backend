import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

export class FilterAdmissionSourceDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by enabled status' })
  @IsOptional()
  @IsBoolean()
  @ToBoolean()
  is_enabled?: boolean;
}

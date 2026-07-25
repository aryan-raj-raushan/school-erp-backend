import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HolidaysService } from './holidays.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { FilterHolidayDto } from './dto/filter-holiday.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ParentAccessible } from '../../common/decorators/parent-accessible.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Holidays')
@ApiBearerAuth('access-token')
@Controller('holidays')
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Post()
  @Permissions(PERMISSION_REGISTRY.holidays.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a holiday' })
  async create(
    @Body() dto: CreateHolidayDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.holidaysService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Holiday created successfully');
  }

  @Get()
  @ParentAccessible()
  @ApiOperation({ summary: 'List holidays with optional filters' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterHolidayDto) {
    const data = await this.holidaysService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Holidays fetched successfully', data.meta);
  }

  @Patch(':id')
  @Permissions(PERMISSION_REGISTRY.holidays.update)
  @ApiOperation({ summary: 'Update a holiday' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateHolidayDto,
  ) {
    const data = await this.holidaysService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Holiday updated successfully');
  }

  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.holidays.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a holiday' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.holidaysService.remove(id, schoolId);
    return ApiResponse.noContent('Holiday deleted successfully');
  }
}

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
import { SchoolEventsService } from './school-events.service';
import { CreateSchoolEventDto } from './dto/create-school-event.dto';
import { UpdateSchoolEventDto } from './dto/update-school-event.dto';
import { SchoolEventFilterDto } from './dto/school-event-filter.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ParentAccessible } from '../../common/decorators/parent-accessible.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('School Events & Holidays')
@ApiBearerAuth('access-token')
@Controller('school-events')
export class SchoolEventsController {
  constructor(private readonly schoolEventsService: SchoolEventsService) {}

  @Get()
  @ParentAccessible()
  @ApiOperation({ summary: 'List all events and holidays with filters' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: SchoolEventFilterDto) {
    const data = await this.schoolEventsService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'School events fetched successfully', data.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a school event or holiday by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.schoolEventsService.findById(id, schoolId);
    return ApiResponse.success(data, 'School event fetched successfully');
  }

  @Post()
  @Permissions(PERMISSION_REGISTRY.events.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new event or holiday' })
  async create(
    @Body() dto: CreateSchoolEventDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.schoolEventsService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'School event created successfully');
  }

  @Patch(':id')
  @Permissions(PERMISSION_REGISTRY.events.update)
  @ApiOperation({ summary: 'Update an event or holiday' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateSchoolEventDto,
  ) {
    const data = await this.schoolEventsService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'School event updated successfully');
  }

  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.events.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an event or holiday' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.schoolEventsService.remove(id, schoolId);
    return ApiResponse.noContent('School event deleted successfully');
  }
}

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
import { TimetableSessionsService } from './timetable-sessions.service';
import { CreateTimetableSessionDto } from './dto/create-timetable-session.dto';
import { UpdateTimetableSessionDto } from './dto/update-timetable-session.dto';
import { FilterTimetableSessionDto } from './dto/filter-timetable-session.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { SchoolRole } from '../../shared/enums';

const ALL_SCHOOL_ROLES = [
  SchoolRole.SCHOOL_ADMIN,
  SchoolRole.PRINCIPAL,
  SchoolRole.VICE_PRINCIPAL,
  SchoolRole.TEACHER,
  SchoolRole.CLASS_TEACHER,
  SchoolRole.ACCOUNTANT,
  SchoolRole.LIBRARIAN,
];

const ADMIN_ROLES = [SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL];

@ApiTags('Timetable Sessions')
@ApiBearerAuth('access-token')
@Controller('timetable-sessions')
export class TimetableSessionsController {
  constructor(private readonly timetableSessionsService: TimetableSessionsService) {}

  @Post()
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a timetable session' })
  async create(
    @Body() dto: CreateTimetableSessionDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.timetableSessionsService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Timetable session created successfully');
  }

  @Get()
  @Roles(...ALL_SCHOOL_ROLES)
  @ApiOperation({ summary: 'List timetable sessions with optional filters' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterTimetableSessionDto) {
    const data = await this.timetableSessionsService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Timetable sessions fetched successfully', data.meta);
  }

  @Get('active')
  @Roles(...ALL_SCHOOL_ROLES)
  @ApiOperation({ summary: 'Get the current active timetable session' })
  async findActive(@GetSchoolId() schoolId: string) {
    const data = await this.timetableSessionsService.findActiveSession(schoolId);
    return ApiResponse.success(data, 'Active timetable session fetched successfully');
  }

  @Get(':id')
  @Roles(...ALL_SCHOOL_ROLES)
  @ApiOperation({ summary: 'Get a timetable session by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.timetableSessionsService.findById(id, schoolId);
    return ApiResponse.success(data, 'Timetable session fetched successfully');
  }

  @Patch(':id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update a timetable session' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateTimetableSessionDto,
  ) {
    const data = await this.timetableSessionsService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Timetable session updated successfully');
  }

  @Post(':id/set-active')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a timetable session as the active session' })
  async setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.timetableSessionsService.setActive(id, schoolId);
    return ApiResponse.success(data, 'Active timetable session updated successfully');
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a timetable session' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.timetableSessionsService.remove(id, schoolId);
    return ApiResponse.noContent('Timetable session deleted successfully');
  }
}

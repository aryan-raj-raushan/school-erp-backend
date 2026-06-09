import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TimetableService } from './timetable.service';
import { CreateTimetableDto } from './dto/create-timetable.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { SchoolRole } from '../../shared/enums';

const ADMIN_ROLES = [SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.VICE_PRINCIPAL];
const VIEW_ROLES = [SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.VICE_PRINCIPAL, SchoolRole.TEACHER, SchoolRole.CLASS_TEACHER];

@ApiTags('Timetable')
@ApiBearerAuth('access-token')
@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post()
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a timetable' })
  async create(@Body() dto: CreateTimetableDto, @GetSchoolId() schoolId: string) {
    return ApiResponse.created(await this.timetableService.create(dto, schoolId), 'Timetable created');
  }

  @Get()
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'List timetables' })
  @ApiQuery({ name: 'academic_year_id', required: false })
  @ApiQuery({ name: 'class_id', required: false })
  @ApiQuery({ name: 'class_detail_id', required: false })
  async findAll(
    @GetSchoolId() schoolId: string,
    @Query('academic_year_id') ayId?: string,
    @Query('class_id') classId?: string,
    @Query('class_detail_id') classDetailId?: string,
  ) {
    return ApiResponse.success(
      await this.timetableService.findAll(schoolId, { academic_year_id: ayId, class_id: classId, class_detail_id: classDetailId }),
      'Timetables fetched',
    );
  }

  @Get('employee/:teacherId')
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'Get all timetable entries for a specific teacher' })
  async getEmployeeTimetable(@Param('teacherId', ParseUUIDPipe) teacherId: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(await this.timetableService.getEmployeeTimetable(schoolId, teacherId), 'Employee timetable fetched');
  }

  @Get('session-view')
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'Session day-wise timetable view (all classes for a day)' })
  @ApiQuery({ name: 'day', required: true, enum: ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'] })
  @ApiQuery({ name: 'academic_year_id', required: false })
  @ApiQuery({ name: 'class_id', required: false })
  @ApiQuery({ name: 'timetable_name', required: false })
  async getSessionView(
    @GetSchoolId() schoolId: string,
    @Query('day') day: string,
    @Query('academic_year_id') ayId?: string,
    @Query('class_id') classId?: string,
    @Query('timetable_name') timetableName?: string,
  ) {
    return ApiResponse.success(
      await this.timetableService.getSessionView(schoolId, { day, academic_year_id: ayId, class_id: classId, timetable_name: timetableName }),
      'Session view fetched',
    );
  }

  @Get(':id')
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'Get timetable with full details' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(await this.timetableService.findById(id, schoolId), 'Timetable fetched');
  }

  @Put(':id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update timetable' })
  async update(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string, @Body() dto: Partial<CreateTimetableDto>) {
    return ApiResponse.success(await this.timetableService.update(id, schoolId, dto), 'Timetable updated');
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete timetable' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.timetableService.remove(id, schoolId);
    return ApiResponse.noContent('Timetable deleted');
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TimetableService } from './timetable.service';
import { CreateTimetableDto } from './dto/create-timetable.dto';
import { AutoGenerateTimetableDto } from './dto/auto-generate-timetable.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Timetable')
@ApiBearerAuth('access-token')
@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post()
  @Permissions(PERMISSION_REGISTRY.timetable.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a timetable' })
  async create(@Body() dto: CreateTimetableDto, @GetSchoolId() schoolId: string) {
    return ApiResponse.created(
      await this.timetableService.create(dto, schoolId),
      'Timetable created',
    );
  }

  @Post('auto-generate')
  @Permissions(PERMISSION_REGISTRY.timetable.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Auto-generate a timetable from the class subject-teacher map and a school timing profile',
  })
  async autoGenerate(@Body() dto: AutoGenerateTimetableDto, @GetSchoolId() schoolId: string) {
    const data = await this.timetableService.autoGenerate(dto, schoolId);
    return ApiResponse.created(data, 'Timetable auto-generated');
  }

  @Get()
  @Permissions(PERMISSION_REGISTRY.timetable.view)
  @ApiOperation({ summary: 'List timetables' })
  @ApiQuery({ name: 'academic_year_id', required: false })
  @ApiQuery({ name: 'class_id', required: false })
  async findAll(
    @GetSchoolId() schoolId: string,
    @Query('academic_year_id') ayId?: string,
    @Query('class_id') classId?: string,
  ) {
    return ApiResponse.success(
      await this.timetableService.findAll(schoolId, {
        academic_year_id: ayId,
        class_id: classId,
      }),
      'Timetables fetched',
    );
  }

  @Get('employee/:teacherId')
  @Permissions(PERMISSION_REGISTRY.timetable.view)
  @ApiOperation({ summary: 'Get all timetable entries for a specific teacher' })
  async getEmployeeTimetable(
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @GetSchoolId() schoolId: string,
  ) {
    return ApiResponse.success(
      await this.timetableService.getEmployeeTimetable(schoolId, teacherId),
      'Employee timetable fetched',
    );
  }

  @Get('session-view')
  @Permissions(PERMISSION_REGISTRY.timetable.view)
  @ApiOperation({ summary: 'Session day-wise timetable view (all classes for a day)' })
  @ApiQuery({
    name: 'day',
    required: true,
    enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
  })
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
      await this.timetableService.getSessionView(schoolId, {
        day,
        academic_year_id: ayId,
        class_id: classId,
        timetable_name: timetableName,
      }),
      'Session view fetched',
    );
  }

  @Get(':id')
  @Permissions(PERMISSION_REGISTRY.timetable.view)
  @ApiOperation({ summary: 'Get timetable with full details' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(
      await this.timetableService.findById(id, schoolId),
      'Timetable fetched',
    );
  }

  @Put(':id')
  @Permissions(PERMISSION_REGISTRY.timetable.update)
  @ApiOperation({ summary: 'Update timetable' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: Partial<CreateTimetableDto>,
  ) {
    return ApiResponse.success(
      await this.timetableService.update(id, schoolId, dto),
      'Timetable updated',
    );
  }

  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.timetable.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete timetable' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.timetableService.remove(id, schoolId);
    return ApiResponse.noContent('Timetable deleted');
  }
}

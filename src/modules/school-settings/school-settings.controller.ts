import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SchoolSettingsService } from './school-settings.service';
import {
  UpdateSchoolSettingsDto,
  CreateSchoolTimingDto,
  UpdateSchoolTimingDto,
  SetClassTimingDto,
} from './dto/school-settings.dto';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('School Settings')
@ApiBearerAuth('access-token')
@Controller('school-settings')
export class SchoolSettingsController {
  constructor(private readonly service: SchoolSettingsService) {}

  // ─── Settings ─────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get school attendance configuration' })
  async getSettings(@GetSchoolId() schoolId: string) {
    const data = await this.service.getSettings(schoolId);
    return ApiResponse.success(data, 'Settings fetched successfully');
  }

  @Put()
  @Permissions(PERMISSION_REGISTRY.schoolSettings.update)
  @ApiOperation({ summary: 'Update school attendance configuration' })
  async updateSettings(@GetSchoolId() schoolId: string, @Body() dto: UpdateSchoolSettingsDto) {
    const data = await this.service.updateSettings(schoolId, dto);
    return ApiResponse.success(data, 'Settings updated successfully');
  }

  // ─── Timings ──────────────────────────────────────────────────────────────────

  @Get('timings')
  @ApiOperation({ summary: 'List all school timing schedules' })
  async getTimings(@GetSchoolId() schoolId: string) {
    const data = await this.service.getTimings(schoolId);
    return ApiResponse.success(data, 'Timings fetched successfully');
  }

  @Post('timings')
  @Permissions(PERMISSION_REGISTRY.schoolSettings.update)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new timing schedule' })
  async createTiming(@GetSchoolId() schoolId: string, @Body() dto: CreateSchoolTimingDto) {
    const data = await this.service.createTiming(schoolId, dto);
    return ApiResponse.created(data, 'Timing created successfully');
  }

  @Put('timings/:id')
  @Permissions(PERMISSION_REGISTRY.schoolSettings.update)
  @ApiOperation({ summary: 'Update a timing schedule' })
  async updateTiming(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateSchoolTimingDto,
  ) {
    const data = await this.service.updateTiming(id, schoolId, dto);
    return ApiResponse.success(data, 'Timing updated successfully');
  }

  @Delete('timings/:id')
  @Permissions(PERMISSION_REGISTRY.schoolSettings.update)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a timing schedule' })
  async deleteTiming(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.service.deleteTiming(id, schoolId);
    return ApiResponse.noContent('Timing deleted successfully');
  }

  // ─── Class Timing Overrides ───────────────────────────────────────────────────

  @Get('class-timings')
  @ApiOperation({ summary: 'List class-specific timing overrides' })
  async getClassOverrides(@GetSchoolId() schoolId: string) {
    const data = await this.service.getClassOverrides(schoolId);
    return ApiResponse.success(data, 'Class timings fetched successfully');
  }

  @Put('class-timings/:classId')
  @Permissions(PERMISSION_REGISTRY.schoolSettings.update)
  @ApiOperation({ summary: 'Set or remove timing override for a class' })
  async setClassTiming(
    @Param('classId', ParseUUIDPipe) classId: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: SetClassTimingDto,
  ) {
    const data = await this.service.setClassTiming(classId, schoolId, dto);
    return ApiResponse.success(data, 'Class timing override saved');
  }
}

import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdmissionSourcesService } from './admission-sources.service';
import { CreateAdmissionSourceDto } from './dto/create-admission-source.dto';
import { UpdateAdmissionSourceDto } from './dto/update-admission-source.dto';
import { FilterAdmissionSourceDto } from './dto/filter-admission-source.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { SchoolRole } from '../../shared/enums';

const ADMIN_ROLES = [SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL];
const VIEW_ROLES = [
  SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.VICE_PRINCIPAL,
  SchoolRole.TEACHER, SchoolRole.CLASS_TEACHER,
];

@ApiTags('Admission Sources')
@ApiBearerAuth('access-token')
@Controller('admission-sources')
export class AdmissionSourcesController {
  constructor(private readonly sourcesService: AdmissionSourcesService) {}

  @Get()
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'List all admission sources' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterAdmissionSourceDto) {
    const data = await this.sourcesService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Admission sources fetched successfully', data.meta);
  }

  @Get(':id')
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'Get admission source by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.sourcesService.findById(id, schoolId);
    return ApiResponse.success(data, 'Admission source fetched successfully');
  }

  @Post()
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an admission source' })
  async create(
    @Body() dto: CreateAdmissionSourceDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.sourcesService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Admission source created successfully');
  }

  @Patch(':id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update an admission source' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateAdmissionSourceDto,
  ) {
    const data = await this.sourcesService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Admission source updated successfully');
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an admission source' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.sourcesService.remove(id, schoolId);
    return ApiResponse.noContent('Admission source deleted successfully');
  }
}
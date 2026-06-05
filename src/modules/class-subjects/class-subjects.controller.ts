import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClassSubjectsService } from './class-subjects.service';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import { ClassSubjectFilterDto } from './dto/class-subject-filter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { SchoolRole } from '../../shared/enums';

const ADMIN_ROLES = [SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL];
const VIEW_ROLES = [SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.VICE_PRINCIPAL, SchoolRole.TEACHER, SchoolRole.CLASS_TEACHER];

@ApiTags('Class Subjects')
@ApiBearerAuth('access-token')
@Controller('class-subjects')
export class ClassSubjectsController {
  constructor(private readonly classSubjectsService: ClassSubjectsService) {}

  @Post()
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a subject to a class-section' })
  async create(@Body() dto: CreateClassSubjectDto, @GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    return ApiResponse.created(await this.classSubjectsService.create(dto, schoolId, userId), 'Subject assigned to class successfully');
  }

  @Get()
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'List subjects assigned to class-sections' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: ClassSubjectFilterDto) {
    const data = await this.classSubjectsService.findAll(schoolId, filters);
    return ApiResponse.success(data, 'Class subjects fetched successfully');
  }

  @Get(':id')
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'Get a single class-subject assignment' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(await this.classSubjectsService.findById(id, schoolId), 'Class subject fetched successfully');
  }

  @Put(':id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update a class-subject assignment' })
  async update(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string, @Body() dto: Partial<CreateClassSubjectDto>) {
    return ApiResponse.success(await this.classSubjectsService.update(id, schoolId, dto), 'Class subject updated successfully');
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a subject assignment from a class-section' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.classSubjectsService.remove(id, schoolId);
    return ApiResponse.noContent('Class subject removed successfully');
  }
}

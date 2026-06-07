import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { FilterDepartmentDto } from './dto/filter-department.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { SchoolRole } from '../../shared/enums';

const ALL_SCHOOL_ROLES = [
  SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.VICE_PRINCIPAL,
  SchoolRole.TEACHER, SchoolRole.CLASS_TEACHER, SchoolRole.ACCOUNTANT, SchoolRole.LIBRARIAN,
];
const ADMIN_ROLES = [SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL];

@ApiTags('Departments')
@ApiBearerAuth('access-token')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a department' })
  async create(
    @Body() dto: CreateDepartmentDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.departmentsService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Department created successfully');
  }

  @Get()
  @Roles(...ALL_SCHOOL_ROLES)
  @ApiOperation({ summary: 'List departments' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterDepartmentDto) {
    const data = await this.departmentsService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Departments fetched successfully', data.meta);
  }

  @Get(':id')
  @Roles(...ALL_SCHOOL_ROLES)
  @ApiOperation({ summary: 'Get department by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.departmentsService.findById(id, schoolId);
    return ApiResponse.success(data, 'Department fetched successfully');
  }

  @Patch(':id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update a department' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    const data = await this.departmentsService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Department updated successfully');
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a department' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.departmentsService.remove(id, schoolId);
    return ApiResponse.noContent('Department deleted successfully');
  }
}

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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { FilterDepartmentDto } from './dto/filter-department.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Departments')
@ApiBearerAuth('access-token')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Permissions(PERMISSION_REGISTRY.departments.create)
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
  @Permissions(PERMISSION_REGISTRY.departments.view)
  @ApiOperation({ summary: 'List departments' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterDepartmentDto) {
    const data = await this.departmentsService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Departments fetched successfully', data.meta);
  }

  @Get(':id')
  @Permissions(PERMISSION_REGISTRY.departments.view)
  @ApiOperation({ summary: 'Get department by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.departmentsService.findById(id, schoolId);
    return ApiResponse.success(data, 'Department fetched successfully');
  }

  @Patch(':id')
  @Permissions(PERMISSION_REGISTRY.departments.update)
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
  @Permissions(PERMISSION_REGISTRY.departments.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a department' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.departmentsService.remove(id, schoolId);
    return ApiResponse.noContent('Department deleted successfully');
  }
}

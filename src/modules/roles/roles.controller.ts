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
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { FilterRoleDto } from './dto/filter-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { RolesService } from './roles.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('')
@ApiBearerAuth('access-token')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Permissions(PERMISSION_REGISTRY.roles.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom role (e.g. Driver, HOD, Parent)' })
  async create(
    @Body() dto: CreateRoleDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.rolesService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Role created successfully');
  }

  @Get()
  @Permissions(PERMISSION_REGISTRY.roles.view)
  @ApiOperation({ summary: 'List all roles for the school' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterRoleDto) {
    const data = await this.rolesService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, ' fetched successfully', data.meta);
  }

  @Get(':id')
  @Permissions(PERMISSION_REGISTRY.roles.view)
  @ApiOperation({ summary: 'Get role by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.rolesService.findById(id, schoolId);
    return ApiResponse.success(data, 'Role fetched successfully');
  }

  @Patch(':id')
  @Permissions(PERMISSION_REGISTRY.roles.update)
  @ApiOperation({ summary: 'Update a role' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const data = await this.rolesService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Role updated successfully');
  }

  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.roles.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a custom role (system roles cannot be deleted)' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.rolesService.remove(id, schoolId);
    return ApiResponse.noContent('Role deleted successfully');
  }

  @Post(':id/permissions')
  @Permissions(PERMISSION_REGISTRY.roles.update)
  @ApiOperation({ summary: 'Assign permissions to a role (replaces existing)' })
  async assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    const data = await this.rolesService.assignPermissions(id, schoolId, dto);
    return ApiResponse.success(data, 'Permissions assigned successfully');
  }

  @Get(':id/permissions')
  @Permissions(PERMISSION_REGISTRY.roles.view)
  @ApiOperation({ summary: 'List permissions assigned to a role' })
  async getRolePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.rolesService.getRolePermissions(id, schoolId);
    return ApiResponse.success(data, 'Role permissions fetched successfully');
  }
}

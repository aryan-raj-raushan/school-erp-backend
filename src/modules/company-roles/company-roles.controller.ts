import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { CompanyRole } from '../../shared/enums';
import { CompanyRolesService } from './company-roles.service';
import { CreateCompanyRoleDto, UpdateCompanyRoleDto } from './dto/company-role.dto';

@ApiTags('Company Roles')
@ApiBearerAuth('access-token')
@Controller('company-roles')
@Roles(CompanyRole.SUPER_ADMIN)
export class CompanyRolesController {
  constructor(private readonly service: CompanyRolesService) {}

  @Get('permissions')
  @ApiOperation({ summary: 'Platform permission catalog and built-in role permissions' })
  catalog() {
    return ApiResponse.success(this.service.catalog(), 'Permission catalog fetched');
  }

  @Get()
  @ApiOperation({ summary: 'List custom platform roles (SUPER_ADMIN only)' })
  async findAll() {
    return ApiResponse.success(await this.service.findAll(), 'Roles fetched');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom platform role (SUPER_ADMIN only)' })
  async create(@Body() dto: CreateCompanyRoleDto, @GetCurrentUserId() userId: string) {
    return ApiResponse.created(await this.service.create(dto, userId), 'Role created');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a custom platform role (SUPER_ADMIN only)' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCompanyRoleDto) {
    return ApiResponse.success(await this.service.update(id, dto), 'Role updated');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an unused custom platform role (SUPER_ADMIN only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return ApiResponse.noContent('Role deleted');
  }
}

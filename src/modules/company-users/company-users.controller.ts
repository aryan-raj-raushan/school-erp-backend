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
import { CompanyUsersService } from './company-users.service';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';
import { CompanyUserFilterDto } from './dto/company-user-filter.dto';
import { AssignSchoolDto } from './dto/assign-school.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { CompanyRole } from '../../shared/enums';

// Team management (Sales/Operator/Support/Admin logins) — SUPER_ADMIN only throughout.
@ApiTags('Company Users')
@ApiBearerAuth('access-token')
@Controller('company-users')
@Roles(CompanyRole.SUPER_ADMIN)
export class CompanyUsersController {
  constructor(private readonly companyUsersService: CompanyUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List company staff (Admin/Support/Sales/Operator) — SUPER_ADMIN only' })
  async findAll(@Query() filters: CompanyUserFilterDto) {
    const data = await this.companyUsersService.findAll(filters);
    return ApiResponse.success(data.items, 'Company users fetched successfully', data.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a company user by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.companyUsersService.findById(id);
    return ApiResponse.success(data);
  }

  @Get(':id/schools')
  @ApiOperation({ summary: "List a Sales/Operator user's assigned schools" })
  async listSchools(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.companyUsersService.listSchools(id);
    return ApiResponse.success(data);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a Sales/Operator/Support/Admin login' })
  async create(@Body() dto: CreateCompanyUserDto) {
    const data = await this.companyUsersService.create(dto);
    return ApiResponse.created(data, 'Company user created successfully');
  }

  @Post(':id/schools')
  @ApiOperation({ summary: 'Assign a school to a Sales/Operator user' })
  async assignSchool(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignSchoolDto,
    @GetCurrentUserId() grantedBy: string,
  ) {
    const data = await this.companyUsersService.assignSchool(id, dto.school_id, grantedBy);
    return ApiResponse.success(data, 'School assigned successfully');
  }

  @Delete(':id/schools/:schoolId')
  @ApiOperation({ summary: 'Unassign a school from a Sales/Operator user' })
  async unassignSchool(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
  ) {
    const data = await this.companyUsersService.unassignSchool(id, schoolId);
    return ApiResponse.success(data, 'School unassigned successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a company user' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCompanyUserDto) {
    const data = await this.companyUsersService.update(id, dto);
    return ApiResponse.success(data, 'Company user updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a company user' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.companyUsersService.remove(id);
    return ApiResponse.noContent('Company user deleted successfully');
  }
}

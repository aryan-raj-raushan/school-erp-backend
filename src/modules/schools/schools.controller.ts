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
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { UpdateSchoolProfileDto } from './dto/update-school-profile.dto';
import { SchoolFilterDto } from './dto/school-filter.dto';
import { DeleteSchoolDto } from './dto/delete-school.dto';
import { NoTimeout } from '../../common/decorators/no-timeout.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetCurrentUser } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { CompanyRole } from '../../shared/enums';
import { JwtPayload } from '../../shared/types/jwt-payload.types';
import { PlatformPermissions } from '../../common/decorators/platform-permission.decorator';
import { PLATFORM_PERMISSIONS } from '../../shared/constants/platform-permissions';

@ApiTags('Schools')
@ApiBearerAuth('access-token')
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get the current school profile (school-context auth)' })
  async getMyProfile(@GetSchoolId() schoolId: string) {
    const data = await this.schoolsService.getMyProfile(schoolId);
    return ApiResponse.success(data, 'School profile fetched successfully');
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update the current school profile (school-context auth)' })
  async updateMyProfile(@GetSchoolId() schoolId: string, @Body() dto: UpdateSchoolProfileDto) {
    const data = await this.schoolsService.updateMyProfile(schoolId, dto);
    return ApiResponse.success(data, 'School profile updated successfully');
  }

  @PlatformPermissions(PLATFORM_PERMISSIONS.schools.view)
  @Get()
  @Roles(
    CompanyRole.SUPER_ADMIN,
    CompanyRole.ADMIN,
    CompanyRole.SUPPORT,
    CompanyRole.SALES,
    CompanyRole.OPERATOR,
  )
  @ApiOperation({ summary: 'List all schools with pagination & filters' })
  async findAll(@Query() filters: SchoolFilterDto, @GetCurrentUser() user: JwtPayload) {
    const data = await this.schoolsService.findAll(filters, user.sub, user.role as string);
    return ApiResponse.success(data.items, 'Schools fetched successfully', data.meta);
  }

  @PlatformPermissions(PLATFORM_PERMISSIONS.schools.view)
  @Get(':id')
  @Roles(
    CompanyRole.SUPER_ADMIN,
    CompanyRole.ADMIN,
    CompanyRole.SUPPORT,
    CompanyRole.SALES,
    CompanyRole.OPERATOR,
  )
  @ApiOperation({ summary: 'Get school by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetCurrentUser() user: JwtPayload) {
    const data = await this.schoolsService.findById(id, user.sub, user.role as string);
    return ApiResponse.success(data);
  }

  @PlatformPermissions(PLATFORM_PERMISSIONS.schools.adminAccess)
  @Get(':id/admin')
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN)
  @ApiOperation({ summary: "Get a school's admin account details, if provisioned" })
  async findAdmin(@Param('id', ParseUUIDPipe) id: string, @GetCurrentUser() user: JwtPayload) {
    const data = await this.schoolsService.getAdmin(id, user.sub, user.role as string);
    return ApiResponse.success(data);
  }

  @PlatformPermissions(PLATFORM_PERMISSIONS.schools.adminAccess)
  @Post(':id/admin/reset-password')
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Issue a new temporary password for a school's admin" })
  async resetAdminPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser() user: JwtPayload,
  ) {
    const data = await this.schoolsService.resetAdminPassword(id, user.sub, user.role as string);
    return ApiResponse.success(data, 'Temporary password generated');
  }

  @Post()
  @Roles(CompanyRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new school (SUPER_ADMIN only)' })
  async create(@Body() dto: CreateSchoolDto, @GetCurrentUser() user: JwtPayload) {
    const data = await this.schoolsService.create(dto, user.sub);
    return ApiResponse.created(data, 'School created successfully');
  }

  @PlatformPermissions(PLATFORM_PERMISSIONS.schools.manage)
  @Patch(':id')
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN, CompanyRole.SALES, CompanyRole.OPERATOR)
  @ApiOperation({ summary: 'Update school details (scoped to assigned schools for Sales)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    const data = await this.schoolsService.update(id, dto, user.sub, user.role as string);
    return ApiResponse.success(data, 'School updated successfully');
  }

  @Get(':id/deletion-summary')
  @Roles(CompanyRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'What will be lost if this school is deleted, and when it was last backed up',
  })
  async deletionSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser() user: JwtPayload,
  ) {
    const data = await this.schoolsService.getDeletionSummary(id, user.sub, user.role as string);
    return ApiResponse.success(data, 'Deletion summary fetched successfully');
  }

  @Delete(':id')
  @Roles(CompanyRole.SUPER_ADMIN)
  @NoTimeout()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Permanently delete a school with all its data and files (SUPER_ADMIN only)',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeleteSchoolDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    const data = await this.schoolsService.remove(id, dto, user.sub, user.role as string);
    return ApiResponse.success(data, 'School and all its data were permanently deleted');
  }
}

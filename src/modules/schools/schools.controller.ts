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
import { SchoolFilterDto } from './dto/school-filter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetCurrentUser, GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { CompanyRole } from '../../shared/enums';
import { JwtPayload } from '../../shared/types/jwt-payload.types';

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
  async updateMyProfile(
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateSchoolDto,
  ) {
    const data = await this.schoolsService.updateMyProfile(schoolId, dto);
    return ApiResponse.success(data, 'School profile updated successfully');
  }

  @Get()
  @Roles(
    CompanyRole.SUPER_ADMIN,
    CompanyRole.ADMIN,
    CompanyRole.SUPPORT,
    CompanyRole.SALES,
    CompanyRole.OPERATOR,
  )
  @ApiOperation({ summary: 'List all schools with pagination & filters' })
  async findAll(
    @Query() filters: SchoolFilterDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    const data = await this.schoolsService.findAll(filters, user.sub, user.role as string);
    return ApiResponse.success(data.items, 'Schools fetched successfully', data.meta);
  }

  @Get(':id')
  @Roles(
    CompanyRole.SUPER_ADMIN,
    CompanyRole.ADMIN,
    CompanyRole.SUPPORT,
    CompanyRole.SALES,
    CompanyRole.OPERATOR,
  )
  @ApiOperation({ summary: 'Get school by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser() user: JwtPayload,
  ) {
    const data = await this.schoolsService.findById(id, user.sub, user.role as string);
    return ApiResponse.success(data);
  }

  @Get(':id/admin')
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN)
  @ApiOperation({ summary: "Get a school's admin account details, if provisioned" })
  async findAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser() user: JwtPayload,
  ) {
    const data = await this.schoolsService.getAdmin(id, user.sub, user.role as string);
    return ApiResponse.success(data);
  }

  @Post()
  @Roles(CompanyRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new school (SUPER_ADMIN only)' })
  async create(
    @Body() dto: CreateSchoolDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    const data = await this.schoolsService.create(dto, user.sub);
    return ApiResponse.created(data, 'School created successfully');
  }

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

  @Delete(':id')
  @Roles(CompanyRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a school (SUPER_ADMIN only)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser() user: JwtPayload,
  ) {
    await this.schoolsService.remove(id, user.sub, user.role as string);
    return ApiResponse.noContent('School deleted successfully');
  }
}

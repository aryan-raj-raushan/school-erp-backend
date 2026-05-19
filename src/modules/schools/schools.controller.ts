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
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { CompanyRole } from '../../shared/enums';

@ApiTags('Schools')
@ApiBearerAuth('access-token')
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get()
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN, CompanyRole.SUPPORT)
  @ApiOperation({ summary: 'List all schools with pagination & filters' })
  async findAll(@Query() filters: SchoolFilterDto) {
    const data = await this.schoolsService.findAll(filters);
    return ApiResponse.success(data.items, 'Schools fetched successfully', data.meta);
  }

  @Get(':id')
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN, CompanyRole.SUPPORT)
  @ApiOperation({ summary: 'Get school by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.schoolsService.findById(id);
    return ApiResponse.success(data);
  }

  @Post()
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new school' })
  async create(
    @Body() dto: CreateSchoolDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.schoolsService.create(dto, userId);
    return ApiResponse.created(data, 'School created successfully');
  }

  @Patch(':id')
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN)
  @ApiOperation({ summary: 'Update school details' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolDto,
  ) {
    const data = await this.schoolsService.update(id, dto);
    return ApiResponse.success(data, 'School updated successfully');
  }

  @Delete(':id')
  @Roles(CompanyRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a school (SUPER_ADMIN only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.schoolsService.remove(id);
    return ApiResponse.noContent('School deleted successfully');
  }
}

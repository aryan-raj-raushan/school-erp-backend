import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClassTypesService } from './class-types.service';
import { CreateClassTypeDto } from './dto/create-class-type.dto';
import { UpdateClassTypeDto } from './dto/update-class-type.dto';
import { FilterClassTypeDto } from './dto/filter-class-type.dto';
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

@ApiTags('Class Types')
@ApiBearerAuth('access-token')
@Controller('class-types')
export class ClassTypesController {
  constructor(private readonly classTypesService: ClassTypesService) {}

  @Post()
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a class type' })
  async create(
    @Body() dto: CreateClassTypeDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.classTypesService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Class type created successfully');
  }

  @Get()
  @Roles(...ALL_SCHOOL_ROLES)
  @ApiOperation({ summary: 'List class types' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterClassTypeDto) {
    const data = await this.classTypesService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Class types fetched successfully', data.meta);
  }

  @Get(':id')
  @Roles(...ALL_SCHOOL_ROLES)
  @ApiOperation({ summary: 'Get class type by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.classTypesService.findById(id, schoolId);
    return ApiResponse.success(data, 'Class type fetched successfully');
  }

  @Patch(':id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update a class type' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateClassTypeDto,
  ) {
    const data = await this.classTypesService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Class type updated successfully');
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a class type' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.classTypesService.remove(id, schoolId);
    return ApiResponse.noContent('Class type deleted successfully');
  }
}

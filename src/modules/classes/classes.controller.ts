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
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassFilterDto } from './dto/class-filter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { SchoolRole } from '../../shared/enums';

@ApiTags('Classes')
@ApiBearerAuth('access-token')
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @Roles(
    SchoolRole.SCHOOL_ADMIN,
    SchoolRole.PRINCIPAL,
    SchoolRole.VICE_PRINCIPAL,
    SchoolRole.TEACHER,
    SchoolRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'List all classes for the school' })
  async findAll(
    @GetSchoolId() schoolId: string,
    @Query() filters: ClassFilterDto,
  ) {
    const data = await this.classesService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Classes fetched successfully', data.meta);
  }

  @Get(':id')
  @Roles(
    SchoolRole.SCHOOL_ADMIN,
    SchoolRole.PRINCIPAL,
    SchoolRole.VICE_PRINCIPAL,
    SchoolRole.TEACHER,
    SchoolRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get class by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.classesService.findById(id, schoolId);
    return ApiResponse.success(data, 'Class fetched successfully');
  }

  @Post()
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new class' })
  async create(
    @Body() dto: CreateClassDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.classesService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Class created successfully');
  }

  @Patch(':id')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update a class' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateClassDto,
  ) {
    const data = await this.classesService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Class updated successfully');
  }

  @Delete(':id')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a class' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    await this.classesService.remove(id, schoolId);
    return ApiResponse.noContent('Class deleted successfully');
  }
}

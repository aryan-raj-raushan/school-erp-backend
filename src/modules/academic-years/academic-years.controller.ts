import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AcademicYearsService } from './academic-years.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { SchoolRole } from '../../shared/enums';

@ApiTags('Academic Years')
@ApiBearerAuth('access-token')
@Controller('academic-years')
export class AcademicYearsController {
  constructor(private readonly academicYearsService: AcademicYearsService) {}

  @Get()
  @Roles(
    SchoolRole.SCHOOL_ADMIN,
    SchoolRole.PRINCIPAL,
    SchoolRole.VICE_PRINCIPAL,
    SchoolRole.TEACHER,
    SchoolRole.CLASS_TEACHER,
    SchoolRole.ACCOUNTANT,
    SchoolRole.LIBRARIAN,
  )
  @ApiOperation({ summary: 'List all academic years for the school' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @GetSchoolId() schoolId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const data = await this.academicYearsService.findAll(schoolId, page, limit);
    return ApiResponse.success(data.items, 'Academic years fetched successfully', data.meta);
  }

  @Get('current')
  @Roles(
    SchoolRole.SCHOOL_ADMIN,
    SchoolRole.PRINCIPAL,
    SchoolRole.VICE_PRINCIPAL,
    SchoolRole.TEACHER,
    SchoolRole.CLASS_TEACHER,
    SchoolRole.ACCOUNTANT,
    SchoolRole.LIBRARIAN,
  )
  @ApiOperation({ summary: 'Get current academic year for the school' })
  async findCurrent(@GetSchoolId() schoolId: string) {
    const data = await this.academicYearsService.findCurrent(schoolId);
    return ApiResponse.success(data, 'Current academic year fetched successfully');
  }

  @Get(':id')
  @Roles(
    SchoolRole.SCHOOL_ADMIN,
    SchoolRole.PRINCIPAL,
    SchoolRole.VICE_PRINCIPAL,
    SchoolRole.TEACHER,
    SchoolRole.CLASS_TEACHER,
    SchoolRole.ACCOUNTANT,
    SchoolRole.LIBRARIAN,
  )
  @ApiOperation({ summary: 'Get academic year by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.academicYearsService.findById(id, schoolId);
    return ApiResponse.success(data, 'Academic year fetched successfully');
  }

  @Post()
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new academic year' })
  async create(
    @Body() dto: CreateAcademicYearDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.academicYearsService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Academic year created successfully');
  }

  @Patch(':id')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update an academic year' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateAcademicYearDto,
  ) {
    const data = await this.academicYearsService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Academic year updated successfully');
  }

  @Post(':id/set-current')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set an academic year as the current active year' })
  async setCurrent(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.academicYearsService.setCurrent(id, schoolId);
    return ApiResponse.success(data, 'Current academic year updated successfully');
  }
}

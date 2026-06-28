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
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Academic Years')
@ApiBearerAuth('access-token')
@Controller('academic-years')
export class AcademicYearsController {
  constructor(private readonly academicYearsService: AcademicYearsService) {}

  // Read routes — no role/permission gate; any authenticated school user needs this data
  @Get()
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
  @ApiOperation({ summary: 'Get current academic year for the school' })
  async findCurrent(@GetSchoolId() schoolId: string) {
    const data = await this.academicYearsService.findCurrent(schoolId);
    return ApiResponse.success(data, 'Current academic year fetched successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get academic year by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.academicYearsService.findById(id, schoolId);
    return ApiResponse.success(data, 'Academic year fetched successfully');
  }

  @Post()
  @Permissions(PERMISSION_REGISTRY.academic_years.create)
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
  @Permissions(PERMISSION_REGISTRY.academic_years.update)
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
  @Permissions(PERMISSION_REGISTRY.academic_years.update)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set an academic year as the current active year' })
  async setCurrent(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.academicYearsService.setCurrent(id, schoolId);
    return ApiResponse.success(data, 'Current academic year updated successfully');
  }

  @Post(':id/freeze')
  @Permissions(PERMISSION_REGISTRY.academic_years.update)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Freeze attendance for an academic year (no further edits)' })
  async freeze(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.academicYearsService.freeze(id, schoolId, userId);
    return ApiResponse.success(data, 'Academic year frozen');
  }

  @Post(':id/unfreeze')
  @Permissions(PERMISSION_REGISTRY.academic_years.update)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfreeze academic year' })
  async unfreeze(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.academicYearsService.unfreeze(id, schoolId);
    return ApiResponse.success(data, 'Academic year unfrozen');
  }

  @Post('rollover')
  @Permissions(PERMISSION_REGISTRY.academic_years.update)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Roll over policies and balances from one year to another' })
  async rollover(
    @GetSchoolId() schoolId: string,
    @Body() body: { from_id: string; to_id: string },
  ) {
    const data = await this.academicYearsService.rollover(body.from_id, body.to_id, schoolId);
    return ApiResponse.success(data, 'Rollover completed');
  }
}

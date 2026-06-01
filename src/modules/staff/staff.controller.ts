import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { FilterStaffDto } from './dto/filter-staff.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { SchoolRole } from '../../shared/enums';

const ADMIN_ROLES = [SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL];
const VIEW_ROLES = [
  SchoolRole.SCHOOL_ADMIN,
  SchoolRole.PRINCIPAL,
  SchoolRole.VICE_PRINCIPAL,
  SchoolRole.TEACHER,
  SchoolRole.CLASS_TEACHER,
  SchoolRole.ACCOUNTANT,
  SchoolRole.LIBRARIAN,
];

@ApiTags('Staff')
@ApiBearerAuth('access-token')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a school staff member' })
  async create(
    @Body() dto: CreateStaffDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.staffService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Staff member created successfully');
  }

  @Get()
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'Get all school staff members' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterStaffDto) {
    const data = await this.staffService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Staff members fetched successfully', data.meta);
  }

  @Get('bulk/template')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Download bulk staff import template' })
  async getTemplate(@Res() res: Response) {
    const buffer = await this.staffService.getBulkTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=staff_import_template.xlsx');
    res.send(buffer);
  }

  @Post('bulk/import')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk-import staff via Excel' })
  async bulkImport(
    @UploadedFile() file: Express.Multer.File,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.staffService.bulkImport(file.buffer, schoolId, userId);
    return ApiResponse.success(data, 'Bulk import job enqueued');
  }

  @Get('bulk/status/:jobId')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Poll bulk import job status' })
  async getBulkStatus(@Param('jobId') jobId: string) {
    const data = await this.staffService.getBulkStatus(jobId);
    return ApiResponse.success(data, 'Job status fetched');
  }

  @Get(':id')
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'Get a staff member by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.staffService.findById(id, schoolId);
    return ApiResponse.success(data, 'Staff member fetched successfully');
  }

  @Put(':id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update a staff member' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateStaffDto,
  ) {
    const data = await this.staffService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Staff member updated successfully');
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a staff member' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.staffService.remove(id, schoolId);
    return ApiResponse.noContent('Staff member deleted successfully');
  }

  @Patch(':id/offboard')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Offboard a staff member (deactivate)' })
  async offboard(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.staffService.offboard(id, schoolId);
    return ApiResponse.success(data, 'Staff member offboarded successfully');
  }

  @Patch(':id/reonboard')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Re-onboard a staff member (reactivate)' })
  async reonboard(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.staffService.reonboard(id, schoolId);
    return ApiResponse.success(data, 'Staff member re-onboarded successfully');
  }
}

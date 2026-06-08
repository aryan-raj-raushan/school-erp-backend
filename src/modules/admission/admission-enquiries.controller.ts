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
import { AdmissionEnquiriesService } from './admission-enquiries.service';
import { CreateAdmissionEnquiryDto } from './dto/create-admission-enquiry.dto';
import { UpdateAdmissionEnquiryDto } from './dto/update-admission-enquiry.dto';
import { FilterAdmissionEnquiryDto } from './dto/filter-admission-enquiry.dto';
import { CreateEnquiryHistoryDto } from './dto/create-enquiry-history.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { SchoolRole } from '../../shared/enums';

const ADMIN_ROLES = [SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL];
const VIEW_ROLES = [
  SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.VICE_PRINCIPAL,
  SchoolRole.TEACHER, SchoolRole.CLASS_TEACHER,
];

@ApiTags('Admission Enquiries')
@ApiBearerAuth('access-token')
@Controller('admission-enquiries')
export class AdmissionEnquiriesController {
  constructor(private readonly enquiriesService: AdmissionEnquiriesService) {}

  @Get()
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'List all admission enquiries with filters' })
  async findAll(
    @GetSchoolId() schoolId: string,
    @Query() filters: FilterAdmissionEnquiryDto,
  ) {
    const data = await this.enquiriesService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Admission enquiries fetched successfully', data.meta);
  }

  @Get(':id')
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'Get admission enquiry by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.enquiriesService.findById(id, schoolId);
    return ApiResponse.success(data, 'Admission enquiry fetched successfully');
  }

  @Get(':id/history')
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'Get history timeline for an enquiry' })
  async getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.enquiriesService.getHistory(id, schoolId);
    return ApiResponse.success(data, 'Enquiry history fetched successfully');
  }

  @Post(':id/history')
  @Roles(...ADMIN_ROLES, SchoolRole.TEACHER, SchoolRole.CLASS_TEACHER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a history entry to an enquiry' })
  async addHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: CreateEnquiryHistoryDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.enquiriesService.addHistory(id, schoolId, dto, userId);
    return ApiResponse.created(data, 'History entry added successfully');
  }

  @Post()
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new admission enquiry' })
  async create(
    @Body() dto: CreateAdmissionEnquiryDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.enquiriesService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Admission enquiry created successfully');
  }

  @Patch(':id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update an admission enquiry' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateAdmissionEnquiryDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.enquiriesService.update(id, schoolId, dto, userId);
    return ApiResponse.success(data, 'Admission enquiry updated successfully');
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an admission enquiry' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    await this.enquiriesService.remove(id, schoolId);
    return ApiResponse.noContent('Admission enquiry deleted successfully');
  }
}
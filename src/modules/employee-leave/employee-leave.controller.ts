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
import { EmployeeLeaveService } from './employee-leave.service';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';

import { CreateLeaveTypeDto, UpdateLeaveTypeDto, FilterLeaveTypeDto } from './dto/leave-type.dto';
import { AssignLeaveBodyDto, FilterAssignedLeaveDto } from './dto/leave-assigned.dto';
import {
  ApplyLeaveDto,
  ReviewLeaveDto,
  FilterLeaveApplicationDto,
} from './dto/leave-application.dto';
import { AdminApplyLeaveDto } from './dto/admin-apply-leave.dto';

// ═══════════════════════════════════════════════════════════════════════════════
// LEAVE TYPES  — /leave-types
// ═══════════════════════════════════════════════════════════════════════════════
@ApiTags('Leave Types')
@ApiBearerAuth('access-token')
@Controller('leave-types')
export class LeaveTypesController {
  constructor(private readonly leaveService: EmployeeLeaveService) {}

  @Get()
  @ApiOperation({ summary: 'List all leave types for the school (with optional filters)' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterLeaveTypeDto) {
    const data = await this.leaveService.findAllLeaveTypes(schoolId, filters);
    return ApiResponse.success(data.items, 'Leave types fetched successfully', data.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single leave type by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.leaveService.findLeaveTypeById(id, schoolId);
    return ApiResponse.success(data, 'Leave type fetched successfully');
  }

  @Post()
  // TODO: Uncomment after adding proper permissions to PERMISSION_REGISTRY
  // @Permissions(PERMISSION_REGISTRY.leave.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new leave type (Admin only)' })
  async create(
    @Body() dto: CreateLeaveTypeDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.leaveService.createLeaveType(dto, schoolId, userId);
    return ApiResponse.created(data, 'Leave type created successfully');
  }

  @Patch(':id')
  // TODO: Uncomment after adding proper permissions to PERMISSION_REGISTRY
  // @Permissions(PERMISSION_REGISTRY.leave.update)
  @ApiOperation({ summary: 'Update a leave type (Admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateLeaveTypeDto,
    // @GetCurrentUserId() userId: string,
  ) {
    const data = await this.leaveService.updateLeaveType(id, schoolId, dto);
    return ApiResponse.success(data, 'Leave type updated successfully');
  }

  @Delete(':id')
  // TODO: Uncomment after adding proper permissions to PERMISSION_REGISTRY
  // @Permissions(PERMISSION_REGISTRY.leave.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a leave type (Admin only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.leaveService.removeLeaveType(id, schoolId);
    return ApiResponse.noContent('Leave type deleted successfully');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEAVE ASSIGNED  — /employees/:employeeId/leaves
// ═══════════════════════════════════════════════════════════════════════════════
@ApiTags('Employee Leave Assignments')
@ApiBearerAuth('access-token')
@Controller('employees/:employeeId/leaves')
export class LeaveAssignedController {
  constructor(private readonly leaveService: EmployeeLeaveService) {}

  @Get()
  @ApiOperation({
    summary: 'List all leave types assigned to an employee (enriched with balance)',
  })
  async findAssigned(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @GetSchoolId() schoolId: string,
    @Query() filters: FilterAssignedLeaveDto,
  ) {
    const data = await this.leaveService.findAssignedLeaves(employeeId, schoolId, filters);
    return ApiResponse.success(data.items, 'Assigned leaves fetched successfully', data.meta);
  }

  @Post()
  // TODO: Uncomment after adding proper permissions to PERMISSION_REGISTRY
  // @Permissions(PERMISSION_REGISTRY.leave.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a leave type to an employee (Admin only)' })
  async assign(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: AssignLeaveBodyDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.leaveService.assignLeave(
      { ...dto, employee_id: employeeId },
      schoolId,
      userId,
    );
    return ApiResponse.created(data, 'Leave assigned successfully');
  }

  @Delete(':assignmentId')
  // TODO: Uncomment after adding proper permissions to PERMISSION_REGISTRY
  // @Permissions(PERMISSION_REGISTRY.leave.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an assigned leave from an employee (Admin only)' })
  async revoke(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @GetSchoolId() schoolId: string,
  ) {
    await this.leaveService.revokeAssignedLeave(assignmentId, schoolId, employeeId);
    return ApiResponse.noContent('Leave assignment revoked successfully');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEAVE APPLICATIONS  — /leave-applications
// ═══════════════════════════════════════════════════════════════════════════════
@ApiTags('Leave Applications')
@ApiBearerAuth('access-token')
@Controller('leave-applications')
export class LeaveApplicationsController {
  constructor(private readonly leaveService: EmployeeLeaveService) {}

  // ─── OWNER ? ADMIN: apply for leave ─────────────────────────────────────────────

  @Post('admin-apply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Admin applies leave on behalf of an employee (or themselves)',
  })
  async adminApply(
    @Body() dto: AdminApplyLeaveDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() adminId: string,
  ) {
    const data = await this.leaveService.adminApplyLeave(dto, schoolId, adminId);
    return ApiResponse.created(data, 'Leave application created successfully');
  }

  // ─── Employee: apply for leave ─────────────────────────────────────────────
  @Post()
  // TODO: Uncomment after adding proper permissions to PERMISSION_REGISTRY
  // @Permissions(PERMISSION_REGISTRY.leave.apply)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Apply for a leave (Employee)' })
  async apply(
    @Body() dto: ApplyLeaveDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() employeeId: string,
  ) {
    const data = await this.leaveService.applyLeave(dto, schoolId, employeeId);
    return ApiResponse.created(data, 'Leave application submitted successfully');
  }

  // ─── Employee: cancel own pending application ──────────────────────────────
  @Patch(':id/cancel')
  // TODO: Uncomment after adding proper permissions to PERMISSION_REGISTRY
  // @Permissions(PERMISSION_REGISTRY.leave.apply)
  @ApiOperation({ summary: 'Cancel a pending leave application (Employee)' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() employeeId: string,
  ) {
    const data = await this.leaveService.cancelLeave(id, schoolId, employeeId);
    return ApiResponse.success(data, 'Leave application cancelled successfully');
  }

  // ─── Admin: list all applications (with filters) ───────────────────────────
  @Get()
  // TODO: Uncomment after adding proper permissions to PERMISSION_REGISTRY
  // @Permissions(PERMISSION_REGISTRY.leave.review)
  @ApiOperation({ summary: 'List all leave applications (Admin / HR)' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterLeaveApplicationDto) {
    const data = await this.leaveService.findAllApplications(schoolId, filters);
    return ApiResponse.success(data.items, 'Leave applications fetched successfully', data.meta);
  }

  // ─── Admin: get single application ────────────────────────────────────────
  @Get(':id')
  // TODO: Uncomment after adding proper permissions to PERMISSION_REGISTRY
  // @Permissions(PERMISSION_REGISTRY.leave.review)
  @ApiOperation({ summary: 'Get a single leave application by ID (Admin / HR)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.leaveService.findApplicationById(id, schoolId);
    return ApiResponse.success(data, 'Leave application fetched successfully');
  }

  // ─── Admin: approve or reject ─────────────────────────────────────────────
  @Patch(':id/review')
  // TODO: Uncomment after adding proper permissions to PERMISSION_REGISTRY
  // @Permissions(PERMISSION_REGISTRY.leave.review)
  @ApiOperation({ summary: 'Approve or reject a leave application (Admin / HR)' })
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: ReviewLeaveDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.leaveService.reviewLeave(id, schoolId, dto, userId);
    return ApiResponse.success(data, `Leave application ${dto.status.toLowerCase()} successfully`);
  }
}

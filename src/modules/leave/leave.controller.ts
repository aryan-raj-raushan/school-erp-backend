import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsOptional, IsArray, IsEnum, IsUUID } from 'class-validator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiProperty } from '@nestjs/swagger';
import { ApiProperty as AP } from '@nestjs/swagger';
import { LeaveService } from './leave.service';
import {
  CreateLeavePolicyDto,
  UpdateLeavePolicyDto,
  UpdateLeaveTypeDto,
  ApplyTeacherLeaveDto,
  ReviewLeaveDto,
  ApplyStudentLeaveDto,
} from './dto/leave.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

class ProvisionDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  staff_ids: string[];

  @ApiProperty()
  @IsUUID()
  academic_year_id: string;
}

@ApiTags('Leave Policies')
@ApiBearerAuth('access-token')
@Controller('leave/policies')
export class LeavePoliciesController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @Permissions(PERMISSION_REGISTRY.leave.approve)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create leave policy with leave types' })
  async create(@Body() dto: CreateLeavePolicyDto, @GetSchoolId() schoolId: string) {
    return ApiResponse.created(
      await this.leaveService.createPolicy(dto, schoolId),
      'Leave policy created',
    );
  }

  @Get()
  @Permissions(PERMISSION_REGISTRY.leave.view)
  @ApiOperation({ summary: 'List all leave policies' })
  async findAll(@GetSchoolId() schoolId: string) {
    return ApiResponse.success(
      await this.leaveService.findAllPolicies(schoolId),
      'Policies fetched',
    );
  }

  @Get(':policyId')
  @Permissions(PERMISSION_REGISTRY.leave.view)
  @ApiOperation({ summary: 'Get leave policy by ID (with types)' })
  async findOne(
    @Param('policyId', ParseUUIDPipe) policyId: string,
    @GetSchoolId() schoolId: string,
  ) {
    return ApiResponse.success(
      await this.leaveService.findPolicyById(policyId, schoolId),
      'Policy fetched',
    );
  }

  @Put(':policyId')
  @Permissions(PERMISSION_REGISTRY.leave.approve)
  @ApiOperation({ summary: 'Update leave policy metadata' })
  async update(
    @Param('policyId', ParseUUIDPipe) policyId: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateLeavePolicyDto,
  ) {
    return ApiResponse.success(
      await this.leaveService.updatePolicy(policyId, schoolId, dto),
      'Policy updated',
    );
  }

  @Put('types/:leaveTypeId')
  @Permissions(PERMISSION_REGISTRY.leave.approve)
  @ApiOperation({ summary: 'Update a leave type under a policy' })
  async updateType(
    @Param('leaveTypeId', ParseUUIDPipe) leaveTypeId: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateLeaveTypeDto,
  ) {
    return ApiResponse.success(
      await this.leaveService.updateLeaveType(leaveTypeId, schoolId, dto),
      'Leave type updated',
    );
  }

  @Post(':policyId/provision')
  @Permissions(PERMISSION_REGISTRY.leave.approve)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Provision leave balances for all staff' })
  async provision(
    @Param('policyId', ParseUUIDPipe) policyId: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: ProvisionDto,
  ) {
    return ApiResponse.created(
      await this.leaveService.provisionLeaveBalances(
        policyId,
        schoolId,
        dto.staff_ids,
        dto.academic_year_id,
      ),
      'Leave balances provisioned',
    );
  }
}

@ApiTags('Teacher Leave')
@ApiBearerAuth('access-token')
@Controller('leave/teacher')
export class TeacherLeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post('apply')
  @Permissions(PERMISSION_REGISTRY.leave.view)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Teacher: Apply for leave' })
  async apply(
    @Body() dto: ApplyTeacherLeaveDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    return ApiResponse.created(
      await this.leaveService.applyTeacherLeave(dto, schoolId, userId),
      'Leave applied',
    );
  }

  @Get('my-requests')
  @Permissions(PERMISSION_REGISTRY.leave.view)
  @ApiOperation({ summary: 'Teacher: Own leave request history' })
  async myRequests(@GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    return ApiResponse.success(
      await this.leaveService.getMyTeacherRequests(schoolId, userId),
      'Requests fetched',
    );
  }

  @Get('my-summary')
  @Permissions(PERMISSION_REGISTRY.leave.view)
  @ApiOperation({ summary: 'Teacher: Own leave balance summary' })
  @ApiQuery({ name: 'academic_year_id', required: true })
  async mySummary(
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
    @Query('academic_year_id') ayId: string,
  ) {
    return ApiResponse.success(
      await this.leaveService.getMyTeacherSummary(schoolId, userId, ayId),
      'Summary fetched',
    );
  }

  @Get('all')
  @Permissions(PERMISSION_REGISTRY.leave.view)
  @ApiOperation({ summary: 'Owner/Admin: All teacher leave requests' })
  async allRequests(@GetSchoolId() schoolId: string) {
    return ApiResponse.success(
      await this.leaveService.getAllTeacherRequests(schoolId),
      'All requests fetched',
    );
  }

  @Get('staff-summary')
  @Permissions(PERMISSION_REGISTRY.leave.view)
  @ApiOperation({ summary: 'Owner/Admin: Leave summary for all staff' })
  @ApiQuery({ name: 'academic_year_id', required: true })
  async staffSummary(@GetSchoolId() schoolId: string, @Query('academic_year_id') ayId: string) {
    return ApiResponse.success(
      await this.leaveService.getStaffSummary(schoolId, ayId),
      'Staff summary fetched',
    );
  }

  @Put('review/:requestId')
  @Permissions(PERMISSION_REGISTRY.leave.approve)
  @ApiOperation({ summary: 'Owner/Admin: Approve / reject teacher leave' })
  async review(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: ReviewLeaveDto,
  ) {
    return ApiResponse.success(
      await this.leaveService.reviewTeacherLeave(requestId, schoolId, userId, dto),
      'Request reviewed',
    );
  }

  @Get(':requestId')
  @Permissions(PERMISSION_REGISTRY.leave.view)
  @ApiOperation({ summary: 'Get single teacher leave request by ID' })
  async findOne(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @GetSchoolId() schoolId: string,
  ) {
    return ApiResponse.success(
      await this.leaveService.getTeacherRequestById(requestId, schoolId),
      'Request fetched',
    );
  }
}

@ApiTags('Student Leave')
@ApiBearerAuth('access-token')
@Controller('leave/student')
export class StudentLeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get('all')
  @Permissions(PERMISSION_REGISTRY.leave.view)
  @ApiOperation({ summary: 'List student leave requests' })
  async findAll(@GetSchoolId() schoolId: string) {
    return ApiResponse.success(
      await this.leaveService.getAllStudentRequests(schoolId),
      'Requests fetched',
    );
  }

  @Put('review/:requestId')
  @Permissions(PERMISSION_REGISTRY.leave.approve)
  @ApiOperation({ summary: 'Approve / reject student leave' })
  async review(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: ReviewLeaveDto,
  ) {
    return ApiResponse.success(
      await this.leaveService.reviewStudentLeave(requestId, schoolId, userId, dto),
      'Request reviewed',
    );
  }

  @Get(':requestId')
  @Permissions(PERMISSION_REGISTRY.leave.view)
  @ApiOperation({ summary: 'Get single student leave request by ID' })
  async findOne(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @GetSchoolId() schoolId: string,
  ) {
    return ApiResponse.success(
      await this.leaveService.getStudentRequestById(requestId, schoolId),
      'Request fetched',
    );
  }
}

@ApiTags('Parent Leave')
@ApiBearerAuth('access-token')
@Controller('leave/parent')
export class ParentLeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post('apply')
  @Permissions(PERMISSION_REGISTRY.leave.view)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Parent: Apply for student leave' })
  async apply(
    @Body() dto: ApplyStudentLeaveDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    return ApiResponse.created(
      await this.leaveService.applyStudentLeave(dto, schoolId, userId),
      'Leave applied',
    );
  }

  @Get('my-requests')
  @Permissions(PERMISSION_REGISTRY.leave.view)
  @ApiOperation({ summary: 'Parent: All leave requests submitted by me' })
  async myRequests(@GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    return ApiResponse.success(
      await this.leaveService.getParentRequests(schoolId, userId),
      'Requests fetched',
    );
  }

  @Get('student/:studentId/summary')
  @Permissions(PERMISSION_REGISTRY.leave.view)
  @ApiOperation({ summary: 'Parent: Leave summary for a student' })
  async studentSummary(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @GetSchoolId() schoolId: string,
  ) {
    return ApiResponse.success(
      await this.leaveService.getStudentLeaveBalanceSummary(studentId, schoolId),
      'Summary fetched',
    );
  }
}

class CreateWorkflowStepDto {
  @AP() @IsString() approver_role: string;
  @AP({ required: false }) @IsOptional() @IsString() approver_id?: string;
}

class CreateWorkflowDto {
  @AP() @IsString() name: string;
  @AP({ type: [CreateWorkflowStepDto] }) @IsArray() steps: CreateWorkflowStepDto[];
}

class ApproveStepDto {
  @AP() @IsEnum(['APPROVED', 'REJECTED']) status: 'APPROVED' | 'REJECTED';
  @AP({ required: false }) @IsOptional() @IsString() remarks?: string;
}

@ApiTags('Leave Workflows')
@ApiBearerAuth('access-token')
@Controller('leave/workflows')
export class LeaveWorkflowController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @Permissions(PERMISSION_REGISTRY.leave.approve)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create approval workflow with steps' })
  async create(@Body() dto: CreateWorkflowDto, @GetSchoolId() schoolId: string) {
    return ApiResponse.created(
      await this.leaveService.createWorkflow(schoolId, dto.name, dto.steps),
      'Workflow created',
    );
  }

  @Get()
  @Permissions(PERMISSION_REGISTRY.leave.view)
  @ApiOperation({ summary: 'List approval workflows' })
  async list(@GetSchoolId() schoolId: string) {
    return ApiResponse.success(await this.leaveService.listWorkflows(schoolId), 'Workflows fetched');
  }

  @Get('steps/:leaveRequestId')
  @Permissions(PERMISSION_REGISTRY.leave.view)
  @ApiOperation({ summary: 'Get approval steps for a leave request' })
  async getSteps(@Param('leaveRequestId') leaveRequestId: string) {
    return ApiResponse.success(await this.leaveService.getApprovalSteps(leaveRequestId), 'Steps fetched');
  }

  @Put('steps/:stepId/review')
  @Permissions(PERMISSION_REGISTRY.leave.approve)
  @ApiOperation({ summary: 'Approve or reject an approval step' })
  async reviewStep(
    @Param('stepId') stepId: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: ApproveStepDto,
  ) {
    return ApiResponse.success(
      await this.leaveService.approveLeaveStep(stepId, userId, dto.status, dto.remarks),
      'Step reviewed',
    );
  }
}

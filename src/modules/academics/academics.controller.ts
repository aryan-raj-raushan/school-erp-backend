import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AcademicsService } from './academics.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { BulkMarkSubmissionsDto, UpdateSubmissionDto } from './dto/submission.dto';
import { CreateStudyMaterialDto } from './dto/create-study-material.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { SchoolRole } from '../../shared/enums';

const TEACHER_ROLES = [SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.TEACHER, SchoolRole.CLASS_TEACHER];
const VIEW_ROLES = [SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.VICE_PRINCIPAL, SchoolRole.TEACHER, SchoolRole.CLASS_TEACHER];

@ApiTags('Homework')
@ApiBearerAuth('access-token')
@Controller('homework')
export class HomeworkController {
  constructor(private readonly academicsService: AcademicsService) {}

  @Post()
  @Roles(...TEACHER_ROLES)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a homework assignment' })
  async create(@Body() dto: CreateHomeworkDto, @GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    return ApiResponse.created(await this.academicsService.createHomework(dto, schoolId, userId), 'Homework created successfully');
  }

  @Get()
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'List homework assignments with filters' })
  @ApiQuery({ name: 'class_id', required: false })
  @ApiQuery({ name: 'class_detail_id', required: false })
  @ApiQuery({ name: 'subject_id', required: false })
  @ApiQuery({ name: 'academic_year_id', required: false })
  async findAll(
    @GetSchoolId() schoolId: string,
    @Query('class_id') classId?: string,
    @Query('class_detail_id') classDetailId?: string,
    @Query('subject_id') subjId?: string,
    @Query('academic_year_id') ayId?: string,
  ) {
    const data = await this.academicsService.findAllHomework(schoolId, {
      class_id: classId,
      class_detail_id: classDetailId,
      subject_id: subjId,
      academic_year_id: ayId,
    });
    return ApiResponse.success(data, 'Homework fetched successfully');
  }

  @Get(':id')
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'Get a single homework assignment with attachments' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(await this.academicsService.getHomeworkWithAttachments(id, schoolId), 'Homework fetched successfully');
  }

  @Put(':id')
  @Roles(...TEACHER_ROLES)
  @ApiOperation({ summary: 'Update homework assignment' })
  async update(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string, @Body() dto: Partial<CreateHomeworkDto>) {
    return ApiResponse.success(await this.academicsService.updateHomework(id, schoolId, dto), 'Homework updated successfully');
  }

  @Delete(':id')
  @Roles(...TEACHER_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete homework assignment' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.academicsService.deleteHomework(id, schoolId);
    return ApiResponse.noContent('Homework deleted successfully');
  }

  @Post(':homeworkId/submissions')
  @Roles(...TEACHER_ROLES)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk mark homework submissions (teacher)' })
  async bulkMarkSubmissions(@Param('homeworkId', ParseUUIDPipe) hwId: string, @GetSchoolId() schoolId: string, @Body() dto: BulkMarkSubmissionsDto) {
    return ApiResponse.created(await this.academicsService.bulkMarkSubmissions(hwId, dto, schoolId), 'Submissions marked');
  }

  @Get(':homeworkId/submissions')
  @Roles(...TEACHER_ROLES)
  @ApiOperation({ summary: 'List all submissions for homework' })
  async getSubmissions(@Param('homeworkId', ParseUUIDPipe) hwId: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(await this.academicsService.getSubmissions(hwId, schoolId), 'Submissions fetched');
  }

  @Get(':homeworkId/submissions/:studentId')
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'Get submission for specific student' })
  async getStudentSubmission(@Param('homeworkId', ParseUUIDPipe) hwId: string, @Param('studentId', ParseUUIDPipe) sid: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(await this.academicsService.getStudentSubmission(hwId, sid, schoolId), 'Submission fetched');
  }

  @Put(':homeworkId/submissions/:studentId')
  @Roles(...TEACHER_ROLES)
  @ApiOperation({ summary: 'Update student submission' })
  async updateSubmission(@Param('homeworkId', ParseUUIDPipe) hwId: string, @Param('studentId', ParseUUIDPipe) sid: string, @GetSchoolId() schoolId: string, @Body() dto: UpdateSubmissionDto) {
    return ApiResponse.success(await this.academicsService.updateStudentSubmission(hwId, sid, schoolId, dto), 'Submission updated');
  }
}

@ApiTags('Study Materials')
@ApiBearerAuth('access-token')
@Controller('study-materials')
export class StudyMaterialsController {
  constructor(private readonly academicsService: AcademicsService) {}

  @Post()
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.TEACHER, SchoolRole.CLASS_TEACHER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a study material' })
  async create(@Body() dto: CreateStudyMaterialDto, @GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    return ApiResponse.created(await this.academicsService.createMaterial(dto, schoolId, userId), 'Study material uploaded');
  }

  @Get()
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.VICE_PRINCIPAL, SchoolRole.TEACHER, SchoolRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'List study materials with filters' })
  @ApiQuery({ name: 'class_id', required: false })
  @ApiQuery({ name: 'subject_id', required: false })
  @ApiQuery({ name: 'academic_year_id', required: false })
  async findAll(@GetSchoolId() schoolId: string, @Query('class_id') classId?: string, @Query('subject_id') subjId?: string, @Query('academic_year_id') ayId?: string) {
    return ApiResponse.success(await this.academicsService.findAllMaterials(schoolId, { class_id: classId, subject_id: subjId, academic_year_id: ayId }), 'Materials fetched');
  }

  @Get(':id')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.TEACHER, SchoolRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Get a single study material' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(await this.academicsService.findMaterialById(id, schoolId), 'Material fetched');
  }

  @Put(':id')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.TEACHER, SchoolRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Update a study material' })
  async update(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string, @Body() dto: Partial<CreateStudyMaterialDto>) {
    return ApiResponse.success(await this.academicsService.updateMaterial(id, schoolId, dto), 'Material updated');
  }

  @Delete(':id')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.TEACHER, SchoolRole.CLASS_TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a study material' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.academicsService.deleteMaterial(id, schoolId);
    return ApiResponse.noContent('Material deleted');
  }
}

@ApiTags('Parent Homework')
@ApiBearerAuth('access-token')
@Controller('parents/homeworks')
export class ParentHomeworkController {
  constructor(private readonly academicsService: AcademicsService) {}

  @Get()
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.TEACHER, SchoolRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'View student homework list (parent view)' })
  @ApiQuery({ name: 'class_id', required: false })
  async findAll(@GetSchoolId() schoolId: string, @Query('class_id') classId?: string) {
    return ApiResponse.success(await this.academicsService.findAllHomework(schoolId, { class_id: classId }), 'Homework fetched');
  }
}

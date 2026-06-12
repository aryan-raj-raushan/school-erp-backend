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
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto, UpdateStudentDto, StudentDocumentDto } from './dto/create-student.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { ADMIN_ROLES, SchoolRole, VIEW_ROLES } from '../../shared/enums';

@ApiTags('Students')
@ApiBearerAuth('access-token')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // ─── List ─────────────────────────────────────────────────────────────────

  @Get()
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'List students with filters' })
  @ApiQuery({ name: 'academic_year_id', required: false })
  @ApiQuery({ name: 'class_id', required: false })
  @ApiQuery({ name: 'section_id', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'GRADUATED', 'DROPPED'] })
  @ApiQuery({ name: 'gender', required: false, enum: ['MALE', 'FEMALE', 'OTHER'] })
  @ApiQuery({ name: 'is_enabled', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, phone, email, aadhaar' })
  async findAll(
    @GetSchoolId() schoolId: string,
    @Query('academic_year_id') academicYearId?: string,
    @Query('class_id') classId?: string,
    @Query('section_id') sectionId?: string,
    @Query('status') status?: string,
    @Query('gender') gender?: string,
    @Query('is_enabled') isEnabled?: string,
    @Query('search') search?: string,
  ) {
    const filters = {
      academic_year_id: academicYearId,
      class_id: classId,
      section_id: sectionId,
      status,
      gender,
      is_enabled: isEnabled !== undefined ? isEnabled === 'true' : undefined,
      search,
    };
    return ApiResponse.success(
      await this.studentsService.findAll(schoolId, filters),
      'Students fetched successfully',
    );
  }

  // ─── Get Single ───────────────────────────────────────────────────────────

  @Get(':id')
  @Roles(...VIEW_ROLES)
  @ApiOperation({ summary: 'Get full student profile' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    return ApiResponse.success(
      await this.studentsService.findById(id, schoolId),
      'Student fetched successfully',
    );
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post()
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new student with full profile' })
  async create(
    @Body() dto: CreateStudentDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    return ApiResponse.created(
      await this.studentsService.create(dto, schoolId, userId),
      'Student created successfully',
    );
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Put(':id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update student full profile' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return ApiResponse.success(
      await this.studentsService.update(id, schoolId, dto),
      'Student updated successfully',
    );
  }

  // ─── Soft Delete ─────────────────────────────────────────────────────────

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a student' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    await this.studentsService.delete(id, schoolId);
    return ApiResponse.noContent('Student deleted successfully');
  }

  // ─── Enable / Disable ────────────────────────────────────────────────────

  @Patch(':id/enable')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Enable a student (set is_enabled = true)' })
  async enable(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    return ApiResponse.success(
      await this.studentsService.toggleEnabled(id, schoolId, true),
      'Student enabled',
    );
  }

  @Patch(':id/disable')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Disable a student (set is_enabled = false)' })
  async disable(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    return ApiResponse.success(
      await this.studentsService.toggleEnabled(id, schoolId, false),
      'Student disabled',
    );
  }

  // ─── Documents ───────────────────────────────────────────────────────────

  @Post(':id/documents')
  @Roles(...VIEW_ROLES)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add documents to student profile' })
  async addDocuments(
    @Param('id', ParseUUIDPipe) studentId: string,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
    @Body() body: { documents: StudentDocumentDto[] },
  ) {
    return ApiResponse.created(
      await this.studentsService.addDocuments(studentId, schoolId, body.documents, userId),
      'Documents added successfully',
    );
  }

  @Delete(':id/documents/:docId')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a student document' })
  async deleteDocument(
    @Param('id', ParseUUIDPipe) studentId: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @GetSchoolId() schoolId: string,
  ) {
    await this.studentsService.deleteDocument(docId, studentId, schoolId);
    return ApiResponse.noContent('Document deleted');
  }

  // ─── ID Card ─────────────────────────────────────────────────────────────

  @Get(':id/id-card')
  @Roles(...VIEW_ROLES)
  @ApiOperation({
    summary: 'Get student ID card data',
    description:
      'Returns structured data to render a student identity card: name, photo, class, section, roll number, contact, address, and school details.',
  })
  async getIdCard(
    @Param('id', ParseUUIDPipe) studentId: string,
    @GetSchoolId() schoolId: string,
  ) {
    return ApiResponse.success(
      await this.studentsService.getStudentIdCardData(studentId, schoolId),
      'Student ID card data fetched',
    );
  }

  // ─── Pickup / Parent ID Card ──────────────────────────────────────────────

  @Get(':id/pickup-card')
  @Roles(...VIEW_ROLES)
  @ApiOperation({
    summary: 'Get pickup/parent ID card data',
    description:
      'Returns parent details (name, contact) along with student details (class, section, roll number) for generating a parent pickup ID card.',
  })
  async getPickupCard(
    @Param('id', ParseUUIDPipe) studentId: string,
    @GetSchoolId() schoolId: string,
  ) {
    return ApiResponse.success(
      await this.studentsService.getPickupCardData(studentId, schoolId),
      'Pickup card data fetched',
    );
  }
}
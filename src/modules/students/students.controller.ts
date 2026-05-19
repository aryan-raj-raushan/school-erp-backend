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
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentFilterDto } from './dto/student-filter.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { SchoolRole } from '../../shared/enums';

@ApiTags('Students')
@ApiBearerAuth('access-token')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @Roles(
    SchoolRole.SCHOOL_ADMIN,
    SchoolRole.PRINCIPAL,
    SchoolRole.VICE_PRINCIPAL,
    SchoolRole.TEACHER,
    SchoolRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'List all students for the school with pagination and filters' })
  async findAll(
    @GetSchoolId() schoolId: string,
    @Query() filters: StudentFilterDto,
  ) {
    const data = await this.studentsService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Students fetched successfully', data.meta);
  }

  @Get(':id')
  @Roles(
    SchoolRole.SCHOOL_ADMIN,
    SchoolRole.PRINCIPAL,
    SchoolRole.VICE_PRINCIPAL,
    SchoolRole.TEACHER,
    SchoolRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get student by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.studentsService.findById(id, schoolId);
    return ApiResponse.success(data, 'Student fetched successfully');
  }

  @Post()
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new student' })
  async create(
    @Body() dto: CreateStudentDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.studentsService.create(schoolId, dto, userId);
    return ApiResponse.created(data, 'Student created successfully');
  }

  @Patch(':id')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update student details' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateStudentDto,
  ) {
    const data = await this.studentsService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Student updated successfully');
  }

  @Delete(':id')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a student' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    await this.studentsService.remove(id, schoolId);
    return ApiResponse.noContent('Student deleted successfully');
  }

  // Document sub-routes

  @Get(':id/documents')
  @Roles(
    SchoolRole.SCHOOL_ADMIN,
    SchoolRole.PRINCIPAL,
    SchoolRole.VICE_PRINCIPAL,
    SchoolRole.TEACHER,
    SchoolRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all documents for a student' })
  async getDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.studentsService.getDocuments(id, schoolId);
    return ApiResponse.success(data, 'Student documents fetched successfully');
  }

  @Post(':id/documents')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a document for a student' })
  async addDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: CreateDocumentDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.studentsService.addDocument(id, schoolId, dto, userId);
    return ApiResponse.created(data, 'Document uploaded successfully');
  }

  @Delete(':studentId/documents/:docId')
  @Roles(SchoolRole.SCHOOL_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a student document' })
  async removeDocument(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @GetSchoolId() schoolId: string,
  ) {
    await this.studentsService.removeDocument(docId, studentId, schoolId);
    return ApiResponse.noContent('Document deleted successfully');
  }

  // Parent sub-routes

  @Get(':id/parents')
  @Roles(
    SchoolRole.SCHOOL_ADMIN,
    SchoolRole.PRINCIPAL,
    SchoolRole.VICE_PRINCIPAL,
    SchoolRole.TEACHER,
    SchoolRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all parents/guardians for a student' })
  async getParents(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.studentsService.getParents(id, schoolId);
    return ApiResponse.success(data, 'Student parents fetched successfully');
  }

  @Post(':id/parents')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a parent/guardian for a student' })
  async addParent(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: CreateParentDto,
  ) {
    const data = await this.studentsService.addParent(id, schoolId, dto);
    return ApiResponse.created(data, 'Parent added successfully');
  }

  @Patch(':studentId/parents/:parentId')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update a parent/guardian record' })
  async updateParent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('parentId', ParseUUIDPipe) parentId: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateParentDto,
  ) {
    const data = await this.studentsService.updateParent(parentId, studentId, schoolId, dto);
    return ApiResponse.success(data, 'Parent updated successfully');
  }

  @Delete(':studentId/parents/:parentId')
  @Roles(SchoolRole.SCHOOL_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a parent/guardian from a student' })
  async removeParent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('parentId', ParseUUIDPipe) parentId: string,
    @GetSchoolId() schoolId: string,
  ) {
    await this.studentsService.removeParent(parentId, studentId, schoolId);
    return ApiResponse.noContent('Parent deleted successfully');
  }
}

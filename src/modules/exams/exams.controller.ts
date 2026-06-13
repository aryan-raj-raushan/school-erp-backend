import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateExamPolicyDto } from './dto/create-exam-policy.dto';
import { CreateExamTimetableDto } from './dto/create-exam-timetable.dto';
import { CreateExamRoomDto } from './dto/create-exam-room.dto';
import { AssignSeatDto, AutoGenerateSeatingDto } from './dto/assign-seat.dto';
import { BulkExamMarksDto, TeacherRemarkDto } from './dto/exam-marks.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

class RegisterStudentsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  student_ids: string[];
}

class UpdateEligibilityDto {
  @ApiProperty()
  @IsBoolean()
  is_eligible: boolean;
}

@ApiTags('Exams')
@ApiBearerAuth('access-token')
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @Permissions(PERMISSION_REGISTRY.exams.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create exam master' })
  async createExam(
    @Body() dto: CreateExamDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    return ApiResponse.created(
      await this.examsService.createExam(dto, schoolId, userId),
      'Exam created successfully',
    );
  }

  @Get()
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'List exams by academic year' })
  @ApiQuery({ name: 'academic_year_id', required: false })
  async findAllExams(
    @GetSchoolId() schoolId: string,
    @Query('academic_year_id') academicYearId?: string,
  ) {
    return ApiResponse.success(
      await this.examsService.findAllExams(schoolId, academicYearId),
      'Exams fetched successfully',
    );
  }

  @Get(':id')
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'Get exam details' })
  async findExam(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(
      await this.examsService.findExamById(id, schoolId),
      'Exam fetched successfully',
    );
  }

  @Put(':id')
  @Permissions(PERMISSION_REGISTRY.exams.update)
  @ApiOperation({ summary: 'Update exam' })
  async updateExam(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: Partial<CreateExamDto>,
  ) {
    return ApiResponse.success(
      await this.examsService.updateExam(id, schoolId, dto),
      'Exam updated successfully',
    );
  }

  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.exams.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete exam' })
  async deleteExam(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.examsService.deleteExam(id, schoolId);
    return ApiResponse.noContent('Exam deleted successfully');
  }
}

@ApiTags('Exam Policy')
@ApiBearerAuth('access-token')
@Controller('exam-policy')
export class ExamPolicyController {
  constructor(private readonly examsService: ExamsService) {}
  @Post()
  @Permissions(PERMISSION_REGISTRY.exams.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create exam policy' })
  async create(@Body() dto: CreateExamPolicyDto, @GetSchoolId() schoolId: string) {
    return ApiResponse.created(
      await this.examsService.createPolicy(dto, schoolId),
      'Policy created',
    );
  }
  @Get()
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'List exam policies' })
  @ApiQuery({ name: 'exam_id', required: false })
  async findAll(@GetSchoolId() schoolId: string, @Query('exam_id') examId?: string) {
    return ApiResponse.success(
      await this.examsService.findAllPolicies(schoolId, examId),
      'Policies fetched',
    );
  }
  @Get(':id')
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'Get exam policy by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(
      await this.examsService.findPolicyById(id, schoolId),
      'Policy fetched',
    );
  }
  @Put(':id')
  @Permissions(PERMISSION_REGISTRY.exams.update)
  @ApiOperation({ summary: 'Update exam policy' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: Partial<CreateExamPolicyDto>,
  ) {
    return ApiResponse.success(
      await this.examsService.updatePolicy(id, schoolId, dto),
      'Policy updated',
    );
  }
  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.exams.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete exam policy' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.examsService.deletePolicy(id, schoolId);
    return ApiResponse.noContent('Policy deleted');
  }
}

@ApiTags('Exam Timetable')
@ApiBearerAuth('access-token')
@Controller('exam-timetable')
export class ExamTimetableController {
  constructor(private readonly examsService: ExamsService) {}
  @Post()
  @Permissions(PERMISSION_REGISTRY.exams.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create exam timetable entry' })
  async create(@Body() dto: CreateExamTimetableDto, @GetSchoolId() schoolId: string) {
    return ApiResponse.created(
      await this.examsService.createTimetable(dto, schoolId),
      'Timetable entry created',
    );
  }
  @Get()
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'Get exam timetable by exam ID' })
  @ApiQuery({ name: 'exam_id', required: true })
  async findAll(@GetSchoolId() schoolId: string, @Query('exam_id', ParseUUIDPipe) examId: string) {
    return ApiResponse.success(
      await this.examsService.findTimetableByExam(examId, schoolId),
      'Timetable fetched',
    );
  }
  @Get(':id')
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'Get timetable entry by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(
      await this.examsService.findTimetableById(id, schoolId),
      'Entry fetched',
    );
  }
  @Put(':id')
  @Permissions(PERMISSION_REGISTRY.exams.update)
  @ApiOperation({ summary: 'Update timetable entry' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: Partial<CreateExamTimetableDto>,
  ) {
    return ApiResponse.success(
      await this.examsService.updateTimetable(id, schoolId, dto),
      'Entry updated',
    );
  }
  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.exams.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete timetable entry' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.examsService.deleteTimetable(id, schoolId);
    return ApiResponse.noContent('Entry deleted');
  }
}

@ApiTags('Exam Students')
@ApiBearerAuth('access-token')
@Controller('exam-students')
export class ExamStudentsController {
  constructor(private readonly examsService: ExamsService) {}
  @Post('register')
  @Permissions(PERMISSION_REGISTRY.exams.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register class students for exam' })
  async register(
    @Body() dto: RegisterStudentsDto & { exam_id: string },
    @GetSchoolId() schoolId: string,
  ) {
    return ApiResponse.created(
      await this.examsService.registerStudents(dto.exam_id, dto.student_ids, schoolId),
      'Students registered',
    );
  }
  @Get()
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'Get exam students' })
  @ApiQuery({ name: 'exam_id', required: true })
  async findAll(@GetSchoolId() schoolId: string, @Query('exam_id', ParseUUIDPipe) examId: string) {
    return ApiResponse.success(
      await this.examsService.findExamStudents(examId, schoolId),
      'Exam students fetched',
    );
  }
  @Put('eligibility/:examId/:studentId')
  @Permissions(PERMISSION_REGISTRY.exams.update)
  @ApiOperation({ summary: 'Update student eligibility' })
  async updateEligibility(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateEligibilityDto,
  ) {
    return ApiResponse.success(
      await this.examsService.updateStudentEligibility(
        examId,
        studentId,
        schoolId,
        dto.is_eligible,
      ),
      'Eligibility updated',
    );
  }
  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.exams.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove student from exam' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.examsService.removeExamStudent(id, schoolId);
    return ApiResponse.noContent('Student removed from exam');
  }
}

@ApiTags('Exam Rooms')
@ApiBearerAuth('access-token')
@Controller('exam-rooms')
export class ExamRoomsController {
  constructor(private readonly examsService: ExamsService) {}
  @Post()
  @Permissions(PERMISSION_REGISTRY.exams.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add exam room' })
  async create(@Body() dto: CreateExamRoomDto, @GetSchoolId() schoolId: string) {
    return ApiResponse.created(await this.examsService.createRoom(dto, schoolId), 'Room added');
  }
  @Get()
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'Get exam rooms' })
  @ApiQuery({ name: 'exam_id', required: true })
  async findAll(@GetSchoolId() schoolId: string, @Query('exam_id', ParseUUIDPipe) examId: string) {
    return ApiResponse.success(
      await this.examsService.findRoomsByExam(examId, schoolId),
      'Rooms fetched',
    );
  }
  @Get(':id')
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'Get exam room by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(await this.examsService.findRoomById(id, schoolId), 'Room fetched');
  }
  @Put(':id')
  @Permissions(PERMISSION_REGISTRY.exams.update)
  @ApiOperation({ summary: 'Update exam room capacity' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: Partial<CreateExamRoomDto>,
  ) {
    return ApiResponse.success(
      await this.examsService.updateRoom(id, schoolId, dto),
      'Room updated',
    );
  }
  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.exams.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove exam room' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.examsService.deleteRoom(id, schoolId);
    return ApiResponse.noContent('Room removed');
  }
}

@ApiTags('Exam Seating')
@ApiBearerAuth('access-token')
@Controller('exam-seating')
export class ExamSeatingController {
  constructor(private readonly examsService: ExamsService) {}
  @Post()
  @Permissions(PERMISSION_REGISTRY.exams.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign seat to student' })
  async assign(@Body() dto: AssignSeatDto, @GetSchoolId() schoolId: string) {
    return ApiResponse.created(await this.examsService.assignSeat(dto, schoolId), 'Seat assigned');
  }
  @Get()
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'Get seating arrangement' })
  @ApiQuery({ name: 'exam_id', required: true })
  @ApiQuery({ name: 'date', required: false })
  async findAll(
    @GetSchoolId() schoolId: string,
    @Query('exam_id', ParseUUIDPipe) examId: string,
    @Query('date') date?: string,
  ) {
    return ApiResponse.success(
      await this.examsService.findSeating(examId, schoolId, date),
      'Seating fetched',
    );
  }
  @Post('auto-generate')
  @Permissions(PERMISSION_REGISTRY.exams.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Auto-generate seating arrangement' })
  async autoGenerate(@Body() dto: AutoGenerateSeatingDto, @GetSchoolId() schoolId: string) {
    return ApiResponse.created(
      await this.examsService.autoGenerateSeating(dto, schoolId),
      'Seating auto-generated',
    );
  }
  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.exams.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove seat assignment' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.examsService.removeSeat(id, schoolId);
    return ApiResponse.noContent('Seat assignment removed');
  }
}

@ApiTags('Admit Cards')
@ApiBearerAuth('access-token')
@Controller('admit-cards')
export class AdmitCardsController {
  constructor(private readonly examsService: ExamsService) {}
  @Post('generate')
  @Permissions(PERMISSION_REGISTRY.exams.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate admit card for student' })
  async generate(
    @Body() dto: { exam_id: string; student_id: string },
    @GetSchoolId() schoolId: string,
  ) {
    return ApiResponse.created(
      await this.examsService.generateAdmitCard(dto.exam_id, dto.student_id, schoolId),
      'Admit card generated',
    );
  }
  @Post('generate-class')
  @Permissions(PERMISSION_REGISTRY.exams.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate admit cards for entire class' })
  async generateClass(
    @Body() dto: { exam_id: string; student_ids: string[] },
    @GetSchoolId() schoolId: string,
  ) {
    return ApiResponse.created(
      await this.examsService.generateClassAdmitCards(dto.exam_id, dto.student_ids, schoolId),
      'Admit cards generated',
    );
  }
  @Get('student')
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'Get student admit card' })
  @ApiQuery({ name: 'exam_id', required: true })
  @ApiQuery({ name: 'student_id', required: true })
  async getStudent(
    @GetSchoolId() schoolId: string,
    @Query('exam_id') examId: string,
    @Query('student_id') studentId: string,
  ) {
    return ApiResponse.success(
      await this.examsService.getStudentAdmitCard(examId, studentId, schoolId),
      'Admit card fetched',
    );
  }
  @Get('preview')
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'Preview admit card HTML' })
  @ApiQuery({ name: 'exam_id', required: true })
  @ApiQuery({ name: 'student_id', required: true })
  async preview(
    @GetSchoolId() schoolId: string,
    @Query('exam_id') examId: string,
    @Query('student_id') studentId: string,
  ) {
    return ApiResponse.success(
      { html: await this.examsService.previewAdmitCard(examId, studentId, schoolId) },
      'Preview generated',
    );
  }
  @Get('class')
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'Get class admit cards' })
  @ApiQuery({ name: 'exam_id', required: true })
  @ApiQuery({ name: 'class_section_id', required: true })
  async getClass(
    @GetSchoolId() schoolId: string,
    @Query('exam_id') examId: string,
    @Query('class_section_id') classSectionId: string,
  ) {
    return ApiResponse.success(
      await this.examsService.getClassAdmitCards(examId, classSectionId, schoolId),
      'Class admit cards fetched',
    );
  }
}

@ApiTags('Exam Marks')
@ApiBearerAuth('access-token')
@Controller('exam-marks')
export class ExamMarksController {
  constructor(private readonly examsService: ExamsService) {}
  @Post('bulk')
  @Permissions(PERMISSION_REGISTRY.exams.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit exam marks in bulk' })
  async submitBulk(
    @Body() dto: BulkExamMarksDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    return ApiResponse.created(
      await this.examsService.submitBulkMarks(dto, schoolId, userId),
      'Marks submitted',
    );
  }
  @Get()
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'Get exam marks' })
  @ApiQuery({ name: 'exam_id', required: true })
  @ApiQuery({ name: 'class_section_id', required: false })
  @ApiQuery({ name: 'subject_id', required: false })
  async findAll(
    @GetSchoolId() schoolId: string,
    @Query('exam_id') examId: string,
    @Query('class_section_id') csId?: string,
    @Query('subject_id') subjId?: string,
  ) {
    return ApiResponse.success(
      await this.examsService.getExamMarks(examId, schoolId, csId, subjId),
      'Marks fetched',
    );
  }
}

@ApiTags('Teacher Remarks')
@ApiBearerAuth('access-token')
@Controller('teacher-remarks')
export class TeacherRemarksController {
  constructor(private readonly examsService: ExamsService) {}
  @Post()
  @Permissions(PERMISSION_REGISTRY.exams.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a remark for a student' })
  async create(
    @Body() dto: TeacherRemarkDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    return ApiResponse.created(
      await this.examsService.addRemark(dto, schoolId, userId),
      'Remark added',
    );
  }
  @Get()
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'List teacher remarks' })
  @ApiQuery({ name: 'exam_id', required: false })
  @ApiQuery({ name: 'student_id', required: false })
  async findAll(
    @GetSchoolId() schoolId: string,
    @Query('exam_id') examId?: string,
    @Query('student_id') studentId?: string,
  ) {
    return ApiResponse.success(
      await this.examsService.getRemarks(schoolId, examId, studentId),
      'Remarks fetched',
    );
  }
}

@ApiTags('Mark Sheet')
@ApiBearerAuth('access-token')
@Controller('mark-sheet')
export class MarkSheetController {
  constructor(private readonly examsService: ExamsService) {}
  @Get('student/:studentId')
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'Exam-wise mark sheet — single student' })
  @ApiQuery({ name: 'exam_id', required: true })
  async studentMarkSheet(
    @Param('studentId', ParseUUIDPipe) sid: string,
    @GetSchoolId() schoolId: string,
    @Query('exam_id') examId: string,
  ) {
    return ApiResponse.success(
      await this.examsService.getMarkSheetForStudent(sid, examId, schoolId),
      'Mark sheet fetched',
    );
  }
  @Get('class')
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'Exam-wise mark sheet — whole class' })
  @ApiQuery({ name: 'exam_id', required: true })
  @ApiQuery({ name: 'class_section_id', required: true })
  async classMarkSheet(
    @GetSchoolId() schoolId: string,
    @Query('exam_id') examId: string,
    @Query('class_section_id') csId: string,
  ) {
    return ApiResponse.success(
      await this.examsService.getMarkSheetForClass(csId, examId, schoolId),
      'Class mark sheet fetched',
    );
  }
  @Get('student/:studentId/annual')
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'Annual report card — single student' })
  @ApiQuery({ name: 'academic_year_id', required: true })
  async studentAnnual(
    @Param('studentId', ParseUUIDPipe) sid: string,
    @GetSchoolId() schoolId: string,
    @Query('academic_year_id') ayId: string,
  ) {
    return ApiResponse.success(
      await this.examsService.getAnnualMarkSheet(sid, schoolId, ayId),
      'Annual mark sheet fetched',
    );
  }
  @Get('class/annual')
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @ApiOperation({ summary: 'Annual report — all students in class' })
  @ApiQuery({ name: 'class_section_id', required: true })
  @ApiQuery({ name: 'academic_year_id', required: true })
  async classAnnual(
    @GetSchoolId() schoolId: string,
    @Query('class_section_id') csId: string,
    @Query('academic_year_id') ayId: string,
  ) {
    return ApiResponse.success(
      await this.examsService.getClassAnnualMarkSheet(csId, schoolId, ayId),
      'Class annual report fetched',
    );
  }
  @Post('pdf/student/:studentId')
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Enqueue PDF — student exam-wise mark sheet' })
  @ApiQuery({ name: 'exam_id', required: true })
  async pdfStudent(
    @Param('studentId', ParseUUIDPipe) sid: string,
    @GetSchoolId() schoolId: string,
    @Query('exam_id') examId: string,
  ) {
    return ApiResponse.success(
      await this.examsService.enqueuePdf('student_marksheet', { studentId: sid, examId }, schoolId),
      'PDF generation enqueued',
    );
  }
  @Post('pdf/class')
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Enqueue PDF — class exam-wise mark sheet' })
  @ApiQuery({ name: 'exam_id', required: true })
  @ApiQuery({ name: 'class_section_id', required: true })
  async pdfClass(
    @GetSchoolId() schoolId: string,
    @Query('exam_id') examId: string,
    @Query('class_section_id') csId: string,
  ) {
    return ApiResponse.success(
      await this.examsService.enqueuePdf(
        'class_marksheet',
        { examId, classSectionId: csId },
        schoolId,
      ),
      'PDF generation enqueued',
    );
  }
  @Post('pdf/student/:studentId/annual')
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Enqueue PDF — student annual report' })
  @ApiQuery({ name: 'academic_year_id', required: true })
  async pdfStudentAnnual(
    @Param('studentId', ParseUUIDPipe) sid: string,
    @GetSchoolId() schoolId: string,
    @Query('academic_year_id') ayId: string,
  ) {
    return ApiResponse.success(
      await this.examsService.enqueuePdf(
        'student_annual',
        { studentId: sid, academicYearId: ayId },
        schoolId,
      ),
      'PDF generation enqueued',
    );
  }
  @Post('pdf/class/annual')
  @Permissions(PERMISSION_REGISTRY.exams.view)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Enqueue PDF — class annual report' })
  @ApiQuery({ name: 'class_section_id', required: true })
  @ApiQuery({ name: 'academic_year_id', required: true })
  async pdfClassAnnual(
    @GetSchoolId() schoolId: string,
    @Query('class_section_id') csId: string,
    @Query('academic_year_id') ayId: string,
  ) {
    return ApiResponse.success(
      await this.examsService.enqueuePdf(
        'class_annual',
        { classSectionId: csId, academicYearId: ayId },
        schoolId,
      ),
      'PDF generation enqueued',
    );
  }
}

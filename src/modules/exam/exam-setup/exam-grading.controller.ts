import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExamGradingService } from './exam-grading.service';
import {
  CreateExamGradingDto,
  UpdateExamGradingDto,
  CreateExamGradingBulkDto,
} from './dto/exam-grading.dto';
import { GetSchoolId } from '@common/decorators/school-id.decorator';
import { ApiResponse } from '@shared/responses/api-response';
import { GetCurrentUserId } from '@common/decorators/current-user.decorator';

@ApiTags('Exam – Grading Setup')
@ApiBearerAuth('access-token')
@Controller('exam/grading')
export class ExamGradingController {
  constructor(private readonly service: ExamGradingService) {}

  @Get()
  @ApiOperation({ summary: 'List all grading rules for this school' })
  async findAll(@GetSchoolId() schoolId: string) {
    const data = await this.service.findAll(schoolId);
    return ApiResponse.success(data, 'Exam grading fetched successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single grading rule' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.service.findById(id, schoolId);
    return ApiResponse.success(data, 'Exam grading fetched successfully');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a grading rule' })
  async create(
    @Body() dto: CreateExamGradingDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Exam grading created successfully');
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create all grading rules for a school in one call' })
  async bulkCreate(
    @Body() dto: CreateExamGradingBulkDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.bulkCreate(dto, schoolId, userId);
    return ApiResponse.created(data, 'Exam grading created successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a grading rule' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateExamGradingDto,
  ) {
    const data = await this.service.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Exam grading updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a grading rule' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.service.remove(id, schoolId);
    return ApiResponse.noContent('Exam grading deleted successfully');
  }
}

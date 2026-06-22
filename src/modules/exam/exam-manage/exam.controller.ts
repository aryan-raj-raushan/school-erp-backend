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
import { ExamService } from './exam.service';
import { CreateExamDto, UpdateExamDto, FilterExamDto, PublishExamDto } from './dto/exam.dto';
import { GetSchoolId } from '../../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../../shared/responses/api-response';

@ApiTags('Exam – Manage')
@ApiBearerAuth('access-token')
@Controller('exam/exams')
export class ExamController {
  constructor(private readonly service: ExamService) {}

  @Get()
  @ApiOperation({ summary: 'List exams with filters (academic year, class, term, published)' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterExamDto) {
    const data = await this.service.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Exams fetched successfully', data.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exam by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.service.findById(id, schoolId);
    return ApiResponse.success(data, 'Exam fetched successfully');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new exam' })
  async create(
    @Body() dto: CreateExamDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Exam created successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update exam details' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateExamDto,
  ) {
    const data = await this.service.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Exam updated successfully');
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish or un-publish an exam schedule' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: PublishExamDto,
  ) {
    const data = await this.service.publish(id, schoolId, dto);
    return ApiResponse.success(
      data,
      `Exam ${dto.is_published ? 'published' : 'un-published'} successfully`,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an exam' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.service.remove(id, schoolId);
    return ApiResponse.noContent('Exam deleted successfully');
  }
}

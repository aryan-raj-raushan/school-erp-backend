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
import { ExamTemplateService } from './exam-template.service';
import { CreateExamTemplateDto, UpdateExamTemplateDto } from './dto/exam-template.dto';
import { GetSchoolId } from '../../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../../shared/responses/api-response';

@ApiTags('Exam – Templates')
@ApiBearerAuth('access-token')
@Controller('exam/templates')
export class ExamTemplateController {
  constructor(private readonly service: ExamTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'List exam templates (Unit Test, Mid Term, ...)' })
  async findAll(@GetSchoolId() schoolId: string) {
    const data = await this.service.findAll(schoolId);
    return ApiResponse.success(data, 'Exam templates fetched successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exam template by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.service.findById(id, schoolId);
    return ApiResponse.success(data, 'Exam template fetched successfully');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an exam template' })
  async create(
    @Body() dto: CreateExamTemplateDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Exam template created successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an exam template' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateExamTemplateDto,
  ) {
    const data = await this.service.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Exam template updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an exam template' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.service.remove(id, schoolId);
    return ApiResponse.noContent('Exam template deleted successfully');
  }
}

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
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectFilterDto } from './dto/subject-filter.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Subjects')
@ApiBearerAuth('access-token')
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all subjects, optionally filtered by classId, search' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: SubjectFilterDto) {
    const data = await this.subjectsService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Subjects fetched successfully', data.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subject by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.subjectsService.findById(id, schoolId);
    return ApiResponse.success(data, 'Subject fetched successfully');
  }

  @Post()
  @Permissions(PERMISSION_REGISTRY.subjects.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new subject' })
  async create(
    @Body() dto: CreateSubjectDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.subjectsService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Subject created successfully');
  }

  @Patch(':id')
  @Permissions(PERMISSION_REGISTRY.subjects.update)
  @ApiOperation({ summary: 'Update a subject' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateSubjectDto,
  ) {
    const data = await this.subjectsService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Subject updated successfully');
  }

  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.subjects.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a subject' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.subjectsService.remove(id, schoolId);
    return ApiResponse.noContent('Subject deleted successfully');
  }
}

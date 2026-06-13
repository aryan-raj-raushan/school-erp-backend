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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
@ApiTags('Sections')
@ApiBearerAuth('access-token')
@Controller('sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all sections, optionally filtered by classId' })
  @ApiQuery({ name: 'classId', required: false, type: String })
  async findAll(@GetSchoolId() schoolId: string, @Query('classId') classId?: string) {
    const data = await this.sectionsService.findAll(schoolId, classId);
    return ApiResponse.success(data, 'Sections fetched successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get section by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.sectionsService.findById(id, schoolId);
    return ApiResponse.success(data, 'Section fetched successfully');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new section' })
  async create(@Body() dto: CreateSectionDto, @GetSchoolId() schoolId: string) {
    const data = await this.sectionsService.create(dto, schoolId);
    return ApiResponse.created(data, 'Section created successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a section' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    const data = await this.sectionsService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Section updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a section' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.sectionsService.remove(id, schoolId);
    return ApiResponse.noContent('Section deleted successfully');
  }
}

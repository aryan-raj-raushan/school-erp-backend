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
import { SyllabiService } from './syllabi.service';
import { CreateSyllabusDto } from './dto/create-syllabus.dto';
import { UpdateSyllabusDto } from './dto/update-syllabus.dto';
import { FilterSyllabusDto } from './dto/filter-syllabus.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Syllabi')
@ApiBearerAuth('access-token')
@Controller('syllabi')
export class SyllabiController {
  constructor(private readonly syllabiService: SyllabiService) {}

  @Post()
  @Permissions(PERMISSION_REGISTRY.syllabus.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a syllabus with optional file attachments' })
  async create(
    @Body() dto: CreateSyllabusDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.syllabiService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Syllabus created successfully');
  }

  @Get()
  @Permissions(PERMISSION_REGISTRY.syllabus.view)
  @ApiOperation({ summary: 'List syllabi with optional filters' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterSyllabusDto) {
    const data = await this.syllabiService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Syllabi fetched successfully', data.meta);
  }

  @Get(':id')
  @Permissions(PERMISSION_REGISTRY.syllabus.view)
  @ApiOperation({ summary: 'Get syllabus with attachments by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.syllabiService.findById(id, schoolId);
    return ApiResponse.success(data, 'Syllabus fetched successfully');
  }

  @Patch(':id')
  @Permissions(PERMISSION_REGISTRY.syllabus.update)
  @ApiOperation({
    summary: 'Update a syllabus (pass attachments array to replace all attachments)',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateSyllabusDto,
  ) {
    const data = await this.syllabiService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Syllabus updated successfully');
  }

  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.syllabus.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a syllabus' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.syllabiService.remove(id, schoolId);
    return ApiResponse.noContent('Syllabus deleted successfully');
  }
}

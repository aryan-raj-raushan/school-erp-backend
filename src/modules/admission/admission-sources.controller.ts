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
import { AdmissionSourcesService } from './admission-sources.service';
import { CreateAdmissionSourceDto } from './dto/create-admission-source.dto';
import { UpdateAdmissionSourceDto } from './dto/update-admission-source.dto';
import { FilterAdmissionSourceDto } from './dto/filter-admission-source.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Admission Sources')
@ApiBearerAuth('access-token')
@Controller('admission-sources')
export class AdmissionSourcesController {
  constructor(private readonly sourcesService: AdmissionSourcesService) {}

  @Get()
  @ApiOperation({ summary: 'List all admission sources' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterAdmissionSourceDto) {
    const data = await this.sourcesService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Admission sources fetched successfully', data.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get admission source by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.sourcesService.findById(id, schoolId);
    return ApiResponse.success(data, 'Admission source fetched successfully');
  }

  @Post()
  @Permissions(PERMISSION_REGISTRY.admissions.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an admission source' })
  async create(
    @Body() dto: CreateAdmissionSourceDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.sourcesService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Admission source created successfully');
  }

  @Patch(':id')
  @Permissions(PERMISSION_REGISTRY.admissions.update)
  @ApiOperation({ summary: 'Update an admission source' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateAdmissionSourceDto,
  ) {
    const data = await this.sourcesService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Admission source updated successfully');
  }

  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.admissions.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an admission source' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.sourcesService.remove(id, schoolId);
    return ApiResponse.noContent('Admission source deleted successfully');
  }
}

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
import { ClassDetailsService } from './class-details.service';
import { CreateClassDetailDto } from './dto/create-class-detail.dto';
import { UpdateClassDetailDto } from './dto/update-class-detail.dto';
import { FilterClassDetailDto } from './dto/filter-class-detail.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Class Details')
@ApiBearerAuth('access-token')
@Controller('class-details')
export class ClassDetailsController {
  constructor(private readonly classDetailsService: ClassDetailsService) {}

  @Post()
  @Permissions(PERMISSION_REGISTRY.classes.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create class detail (year/semester config)' })
  async create(
    @Body() dto: CreateClassDetailDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.classDetailsService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Class detail created successfully');
  }

  @Get()
  @Permissions(PERMISSION_REGISTRY.classes.view)
  @ApiOperation({ summary: 'List class details with optional filters' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterClassDetailDto) {
    const data = await this.classDetailsService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Class details fetched successfully', data.meta);
  }

  @Get(':id')
  @Permissions(PERMISSION_REGISTRY.classes.view)
  @ApiOperation({ summary: 'Get class detail by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.classDetailsService.findById(id, schoolId);
    return ApiResponse.success(data, 'Class detail fetched successfully');
  }

  @Patch(':id')
  @Permissions(PERMISSION_REGISTRY.classes.update)
  @ApiOperation({ summary: 'Update a class detail' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateClassDetailDto,
  ) {
    const data = await this.classDetailsService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Class detail updated successfully');
  }

  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.classes.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a class detail' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.classDetailsService.remove(id, schoolId);
    return ApiResponse.noContent('Class detail deleted successfully');
  }
}

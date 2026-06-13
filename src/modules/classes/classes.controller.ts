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
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassFilterDto } from './dto/class-filter.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Classes')
@ApiBearerAuth('access-token')
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @ApiOperation({ summary: 'List all classes for the school' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: ClassFilterDto) {
    const data = await this.classesService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Classes fetched successfully', data.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get class by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.classesService.findById(id, schoolId);
    return ApiResponse.success(data, 'Class fetched successfully');
  }

  @Post()
  @Permissions(PERMISSION_REGISTRY.classes.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new class' })
  async create(
    @Body() dto: CreateClassDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.classesService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Class created successfully');
  }

  @Patch(':id')
  @Permissions(PERMISSION_REGISTRY.classes.update)
  @ApiOperation({ summary: 'Update a class' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateClassDto,
  ) {
    const data = await this.classesService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Class updated successfully');
  }

  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.classes.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a class' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.classesService.remove(id, schoolId);
    return ApiResponse.noContent('Class deleted successfully');
  }
}

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
import { ClassTypesService } from './class-types.service';
import { CreateClassTypeDto } from './dto/create-class-type.dto';
import { UpdateClassTypeDto } from './dto/update-class-type.dto';
import { FilterClassTypeDto } from './dto/filter-class-type.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Class Types')
@ApiBearerAuth('access-token')
@Controller('class-types')
export class ClassTypesController {
  constructor(private readonly classTypesService: ClassTypesService) {}

  @Post()
  @Permissions(PERMISSION_REGISTRY.classes.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a class type' })
  async create(
    @Body() dto: CreateClassTypeDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.classTypesService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Class type created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'List class types' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterClassTypeDto) {
    const data = await this.classTypesService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Class types fetched successfully', data.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get class type by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.classTypesService.findById(id, schoolId);
    return ApiResponse.success(data, 'Class type fetched successfully');
  }

  @Patch(':id')
  @Permissions(PERMISSION_REGISTRY.classes.update)
  @ApiOperation({ summary: 'Update a class type' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateClassTypeDto,
  ) {
    const data = await this.classTypesService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Class type updated successfully');
  }

  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.classes.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a class type' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.classTypesService.remove(id, schoolId);
    return ApiResponse.noContent('Class type deleted successfully');
  }
}

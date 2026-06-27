import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExamHallService } from './exam-hall.service';
import { CreateHallDetailDto, UpdateHallDetailDto, FilterHallDetailDto } from './dto/exam-hall.dto';
import { GetSchoolId } from '@common/decorators/school-id.decorator';
import { ApiResponse } from '@shared/responses/api-response';
import { GetCurrentUserId } from '@common/decorators/current-user.decorator';

@ApiTags('Exam – Hall Details')
@ApiBearerAuth('access-token')
@Controller('exam/hall-details')
export class ExamHallDetailController {
  constructor(private readonly service: ExamHallService) {}

  @Get()
  @ApiOperation({ summary: 'List hall room details' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterHallDetailDto) {
    const data = await this.service.findAllDetails(schoolId, filters);
    return ApiResponse.success(data.items, 'Hall details fetched successfully', data.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get hall detail by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.service.findDetailById(id, schoolId);
    return ApiResponse.success(data, 'Hall detail fetched successfully');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create hall room detail' })
  async create(
    @Body() dto: CreateHallDetailDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.createDetail(dto, schoolId, userId);
    return ApiResponse.created(data, 'Hall detail created successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update hall room detail' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateHallDetailDto,
  ) {
    const data = await this.service.updateDetail(id, schoolId, dto);
    return ApiResponse.success(data, 'Hall detail updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete hall room detail' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.service.removeDetail(id, schoolId);
    return ApiResponse.noContent('Hall detail deleted successfully');
  }
}

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
import { ExamHallService } from './exam-hall.service';
import {
  CreateHallPlanDto,
  UpdateHallPlanDto,
  FilterHallPlanDto,
  CreateHallDetailDto,
  UpdateHallDetailDto,
  FilterHallDetailDto,
} from './dto/exam-hall.dto';
import { GetSchoolId } from '@common/decorators/school-id.decorator';
import { ApiResponse } from '@shared/responses/api-response';
import { GetCurrentUserId } from '@common/decorators/current-user.decorator';

// ── Hall Plans ────────────────────────────────────────────────────────────────

@ApiTags('Exam – Hall Plans')
@ApiBearerAuth('access-token')
@Controller('exam/hall-plans')
export class ExamHallPlanController {
  constructor(private readonly service: ExamHallService) {}

  @Get()
  @ApiOperation({ summary: 'List hall plans' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterHallPlanDto) {
    const data = await this.service.findAllPlans(schoolId, filters);
    return ApiResponse.success(data.items, 'Hall plans fetched successfully', data.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get hall plan by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.service.findPlanById(id, schoolId);
    return ApiResponse.success(data, 'Hall plan fetched successfully');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create hall plan' })
  async create(
    @Body() dto: CreateHallPlanDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.createPlan(dto, schoolId, userId);
    return ApiResponse.created(data, 'Hall plan created successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update hall plan' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateHallPlanDto,
  ) {
    const data = await this.service.updatePlan(id, schoolId, dto);
    return ApiResponse.success(data, 'Hall plan updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete hall plan' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.service.removePlan(id, schoolId);
    return ApiResponse.noContent('Hall plan deleted successfully');
  }
}

// ── Hall Details ──────────────────────────────────────────────────────────────

@ApiTags('Exam – Hall Details')
@ApiBearerAuth('access-token')
@Controller('exam/hall-details')
export class ExamHallDetailController {
  constructor(private readonly service: ExamHallService) {}

  @Get()
  @ApiOperation({ summary: 'List hall room details (filter by hall_plan_id)' })
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

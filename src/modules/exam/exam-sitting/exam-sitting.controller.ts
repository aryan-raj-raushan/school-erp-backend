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
import { ExamSittingService } from './exam-sitting.service';
import {
  CreateSittingPlanBulkDto,
  UpdateSittingPlanDto,
  FilterSittingPlanDto,
} from './dto/exam-sitting.dto';
import { GetSchoolId } from '@common/decorators/school-id.decorator';
import { ApiResponse } from '@shared/responses/api-response';
import { GetCurrentUserId } from '@common/decorators/current-user.decorator';

@ApiTags('Exam – Sitting Plan')
@ApiBearerAuth('access-token')
@Controller('exam/sitting-plans')
export class ExamSittingController {
  constructor(private readonly service: ExamSittingService) {}

  @Get()
  @ApiOperation({ summary: 'List sitting plan entries with filters' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterSittingPlanDto) {
    const data = await this.service.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Sitting plans fetched successfully', data.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single sitting plan entry' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.service.findById(id, schoolId);
    return ApiResponse.success(data, 'Sitting plan fetched successfully');
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Bulk assign students to rooms (validates capacity)',
  })
  async bulkCreate(
    @Body() dto: CreateSittingPlanBulkDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.bulkCreate(dto, schoolId, userId);
    return ApiResponse.created(data, 'Sitting plans created successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a sitting plan entry' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateSittingPlanDto,
  ) {
    const data = await this.service.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Sitting plan updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a sitting plan entry' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.service.remove(id, schoolId);
    return ApiResponse.noContent('Sitting plan deleted successfully');
  }
}

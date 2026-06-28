import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EarlyExitsService } from './early-exits.service';
import { CreateEarlyExitDto } from './dto/early-exits.dto';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Early Exits')
@ApiBearerAuth('access-token')
@Controller('early-exits')
export class EarlyExitsController {
  constructor(private readonly service: EarlyExitsService) {}

  @Get()
  @ApiOperation({ summary: 'List early exits' })
  @ApiQuery({ name: 'date', required: false })
  async list(@GetSchoolId() schoolId: string, @Query('date') date?: string) {
    const data = await this.service.findAll(schoolId, date);
    return ApiResponse.success(data, 'Early exits fetched');
  }

  @Post()
  @Permissions(PERMISSION_REGISTRY.attendance.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log an early exit' })
  async create(
    @Body() dto: CreateEarlyExitDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Early exit logged');
  }

  @Put(':id/approve')
  @Permissions(PERMISSION_REGISTRY.attendance.update)
  @ApiOperation({ summary: 'Approve an early exit' })
  async approve(
    @Param('id') id: string,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.approve(id, schoolId, userId);
    return ApiResponse.success(data, 'Early exit approved');
  }

  @Put(':id/reject')
  @Permissions(PERMISSION_REGISTRY.attendance.update)
  @ApiOperation({ summary: 'Reject an early exit' })
  async reject(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    const data = await this.service.reject(id, schoolId);
    return ApiResponse.success(data, 'Early exit rejected');
  }

  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.attendance.update)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an early exit record' })
  async remove(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    await this.service.remove(id, schoolId);
    return ApiResponse.noContent('Early exit deleted');
  }
}

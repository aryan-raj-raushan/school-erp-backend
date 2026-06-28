import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GatePassesService } from './gate-passes.service';
import { CreateGatePassDto } from './dto/gate-passes.dto';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Gate Passes')
@ApiBearerAuth('access-token')
@Controller('gate-passes')
export class GatePassesController {
  constructor(private readonly service: GatePassesService) {}

  @Get()
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiOperation({ summary: 'List gate passes' })
  async list(
    @GetSchoolId() schoolId: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.service.findAll(schoolId, date, status);
    return ApiResponse.success(data, 'Gate passes fetched');
  }

  @Post()
  @Permissions(PERMISSION_REGISTRY.attendance.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a gate pass' })
  async create(
    @Body() dto: CreateGatePassDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Gate pass created');
  }

  @Put(':id/approve')
  @Permissions(PERMISSION_REGISTRY.attendance.update)
  @ApiOperation({ summary: 'Approve gate pass' })
  async approve(
    @Param('id') id: string,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.approve(id, schoolId, userId);
    return ApiResponse.success(data, 'Gate pass approved');
  }

  @Put(':id/reject')
  @Permissions(PERMISSION_REGISTRY.attendance.update)
  @ApiOperation({ summary: 'Reject gate pass' })
  async reject(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    const data = await this.service.reject(id, schoolId);
    return ApiResponse.success(data, 'Gate pass rejected');
  }

  @Post('use/:qrCode')
  @ApiOperation({ summary: 'Mark gate pass as used (guard scan)' })
  async use(@Param('qrCode') qrCode: string) {
    const data = await this.service.use(qrCode);
    return ApiResponse.success(data, 'Gate pass used');
  }

  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.attendance.update)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete gate pass' })
  async remove(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    await this.service.remove(id, schoolId);
    return ApiResponse.noContent('Gate pass deleted');
  }
}

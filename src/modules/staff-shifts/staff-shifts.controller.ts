import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffShiftsService } from './staff-shifts.service';
import { CreateStaffShiftDto, UpdateStaffShiftDto } from './dto/staff-shifts.dto';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Staff Shifts')
@ApiBearerAuth('access-token')
@Controller('staff-shifts')
export class StaffShiftsController {
  constructor(private readonly service: StaffShiftsService) {}

  @Get()
  @ApiOperation({ summary: 'List all staff shifts for the school' })
  async list(@GetSchoolId() schoolId: string) {
    const data = await this.service.list(schoolId);
    return ApiResponse.success(data, 'Staff shifts fetched');
  }

  @Get('staff/:staffId')
  @ApiOperation({ summary: 'List shifts for a specific staff member' })
  async listByStaff(
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.service.listByStaff(staffId, schoolId);
    return ApiResponse.success(data, 'Staff shifts fetched');
  }

  @Get('staff/:staffId/active')
  @ApiOperation({ summary: 'Get the active shift for a staff member on a date' })
  async getActive(
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @GetSchoolId() schoolId: string,
    @Query('date') date: string,
  ) {
    const data = await this.service.getActiveShift(staffId, schoolId, date);
    return ApiResponse.success(data, 'Active shift fetched');
  }

  @Post()
  @Permissions(PERMISSION_REGISTRY.staffShifts.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a shift to a staff member' })
  async create(@GetSchoolId() schoolId: string, @Body() dto: CreateStaffShiftDto) {
    const data = await this.service.create(schoolId, dto);
    return ApiResponse.created(data, 'Staff shift created');
  }

  @Put(':id')
  @Permissions(PERMISSION_REGISTRY.staffShifts.update)
  @ApiOperation({ summary: 'Update a staff shift' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateStaffShiftDto,
  ) {
    const data = await this.service.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Staff shift updated');
  }

  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.staffShifts.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a staff shift' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
  ) {
    await this.service.delete(id, schoolId);
    return ApiResponse.noContent('Staff shift deleted');
  }
}

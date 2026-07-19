import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RfidInventoryService } from './rfid-inventory.service';
import { CreateRfidDeviceDto } from './dto/create-rfid-device.dto';
import { UpdateRfidDeviceDto } from './dto/update-rfid-device.dto';
import { AssignRfidDeviceDto } from './dto/assign-rfid-device.dto';
import { RfidDeviceFilterDto } from './dto/rfid-device-filter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { CompanyRole } from '../../shared/enums';

@ApiTags('RFID Inventory')
@ApiBearerAuth('access-token')
@Controller('rfid-inventory')
@Roles(CompanyRole.SUPER_ADMIN, CompanyRole.OPERATOR)
export class RfidInventoryController {
  constructor(private readonly rfidInventoryService: RfidInventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List RFID devices in inventory' })
  async findAll(@Query() filters: RfidDeviceFilterDto) {
    const data = await this.rfidInventoryService.findAll(filters);
    return ApiResponse.success(data.items, 'RFID devices fetched', data.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an RFID device by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.rfidInventoryService.findById(id);
    return ApiResponse.success(data);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a device to inventory (status: IN_STOCK)' })
  async create(@Body() dto: CreateRfidDeviceDto, @GetCurrentUserId() userId: string) {
    const data = await this.rfidInventoryService.create(dto, userId);
    return ApiResponse.created(data, 'RFID device added');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an RFID device (details or status)' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRfidDeviceDto) {
    const data = await this.rfidInventoryService.update(id, dto);
    return ApiResponse.success(data, 'RFID device updated');
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign a device to a school' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRfidDeviceDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.rfidInventoryService.assign(id, dto, userId);
    return ApiResponse.success(data, 'RFID device assigned');
  }

  @Post(':id/install')
  @ApiOperation({ summary: 'Mark a device as installed at its assigned school' })
  async install(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { installation_date?: string },
  ) {
    const data = await this.rfidInventoryService.install(id, body?.installation_date);
    return ApiResponse.success(data, 'RFID device marked installed');
  }

  @Post(':id/return')
  @ApiOperation({ summary: 'Return a device to stock (unassigns it)' })
  async returnDevice(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.rfidInventoryService.returnDevice(id);
    return ApiResponse.success(data, 'RFID device returned to stock');
  }
}

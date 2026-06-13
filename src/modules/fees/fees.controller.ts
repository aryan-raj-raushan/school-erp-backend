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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { CreateFeeMasterTypeDto } from './dto/create-fee-master-type.dto';
import { UpdateFeeMasterTypeDto } from './dto/update-fee-master-type.dto';
import { CreateFeeDto, BulkCreateFeeDto } from './dto/create-fee.dto';
import { ManualPaymentDto } from './dto/manual-payment.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Fees')
@ApiBearerAuth('access-token')
@Controller('fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  // Master Types
  @Post('master-types')
  @Permissions(PERMISSION_REGISTRY.fees.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create fee master type' })
  async createMasterType(
    @Body() dto: CreateFeeMasterTypeDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.feesService.createMasterType(dto, schoolId, userId);
    return ApiResponse.created(data, 'Fee type created successfully');
  }

  @Get('master-types')
  @ApiOperation({ summary: 'List fee master types' })
  async findAllMasterTypes(@GetSchoolId() schoolId: string) {
    const data = await this.feesService.findAllMasterTypes(schoolId);
    return ApiResponse.success(data, 'Fee types fetched successfully');
  }

  @Patch('master-types/:id')
  @Permissions(PERMISSION_REGISTRY.fees.update)
  @ApiOperation({ summary: 'Update fee master type' })
  async updateMasterType(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateFeeMasterTypeDto,
  ) {
    const data = await this.feesService.updateMasterType(id, schoolId, dto);
    return ApiResponse.success(data, 'Fee type updated successfully');
  }

  @Delete('master-types/:id')
  @Permissions(PERMISSION_REGISTRY.fees.update)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete fee master type' })
  async deleteMasterType(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.feesService.deleteMasterType(id, schoolId);
    return ApiResponse.noContent('Fee type deleted successfully');
  }

  // Fee Receipts
  @Post('single')
  @Permissions(PERMISSION_REGISTRY.fees.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create single fee record' })
  async createSingle(
    @Body() dto: CreateFeeDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.feesService.createSingle(dto, schoolId, userId);
    return ApiResponse.created(data, 'Fee record created successfully');
  }

  @Post('bulk')
  @Permissions(PERMISSION_REGISTRY.fees.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk create fee records' })
  async createBulk(
    @Body() dto: BulkCreateFeeDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.feesService.createBulk(dto, schoolId, userId);
    return ApiResponse.created(data, 'Fee records created successfully');
  }

  @Get('parent')
  @ApiOperation({ summary: 'Get fees for parent view' })
  @ApiQuery({ name: 'student_id', required: false })
  async getParentFees(@GetSchoolId() schoolId: string, @Query('student_id') studentId?: string) {
    const studentIds = studentId ? [studentId] : [];
    const data = await this.feesService.getParentFees(schoolId, studentIds);
    return ApiResponse.success(data.items, 'Fees fetched successfully', data.meta);
  }

  @Get('parent/receipt/:id')
  @ApiOperation({ summary: 'Get fee receipt for parent' })
  async getParentReceipt(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.feesService.findReceiptById(id, schoolId);
    return ApiResponse.success(data, 'Receipt fetched successfully');
  }

  @Post(':receiptId/order')
  @Permissions(PERMISSION_REGISTRY.fees.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create payment order for a receipt' })
  async createOrder(
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.feesService.createPaymentOrder(receiptId, schoolId);
    return ApiResponse.created(data, 'Payment order created successfully');
  }

  @Post(':receiptId/manual-payment')
  @Permissions(PERMISSION_REGISTRY.fees.approve)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record manual payment' })
  async recordManualPayment(
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: ManualPaymentDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.feesService.recordManualPayment(receiptId, schoolId, dto, userId);
    return ApiResponse.created(data, 'Payment recorded successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all fee records' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'student_id', required: false })
  async findAll(
    @GetSchoolId() schoolId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('student_id') studentId?: string,
  ) {
    const data = await this.feesService.findAllReceipts(
      schoolId,
      Number(page) || 1,
      Number(limit) || 20,
      studentId,
    );
    return ApiResponse.success(data.items, 'Fee records fetched successfully', data.meta);
  }

  @Get('receipt/:id')
  @ApiOperation({ summary: 'Get fee receipt by ID' })
  async findReceipt(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.feesService.findReceiptById(id, schoolId);
    return ApiResponse.success(data, 'Receipt fetched successfully');
  }
}

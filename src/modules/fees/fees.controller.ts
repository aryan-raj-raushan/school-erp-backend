import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';
import { CreateFeeTypeDto } from './dto/fee-type/create-fee-type.dto';
import { UpdateFeeTypeDto } from './dto/fee-type/update-fee-type.dto';
import { FilterFeeTypeDto } from './dto/fee-type/filter-fee-type.dto';
import { UpdateFeePlanDto } from './dto/fee-plan/update-fee-plan.dto';
import { UpsertClassStructureDto } from './dto/fee-class-structure/upsert-class-structure.dto';
import { FilterClassStructureDto } from './dto/fee-class-structure/filter-class-structure.dto';
import { CreateTransportRouteDto } from './dto/transport-route/create-transport-route.dto';
import { UpdateTransportRouteDto } from './dto/transport-route/update-transport-route.dto';
import { UpsertRouteFeeDto } from './dto/transport-route-fee/upsert-route-fee.dto';
import { CreateFeeBillDto } from './dto/fee-bill/create-fee-bill.dto';
import { BulkCreateFeeBillDto } from './dto/fee-bill/bulk-create-fee-bill.dto';
import { FilterFeeBillDto } from './dto/fee-bill/filter-fee-bill.dto';
import { CreateFeePaymentDto } from './dto/fee-payment/create-fee-payment.dto';
import { BulkDiscountDto } from './dto/fee-discount/bulk-discount.dto';
import { BulkExtraDto } from './dto/fee-extra/bulk-extra.dto';
import { CreateFeeLateRuleDto } from './dto/fee-late-rule/create-fee-late-rule.dto';
import { UpdateFeeLateRuleDto } from './dto/fee-late-rule/update-fee-late-rule.dto';
import { GenerateDemandReceiptDto } from './dto/demand-receipt/generate-demand-receipt.dto';
import { FilterMonthlyDuesDto } from './dto/monthly-dues/filter-monthly-dues.dto';
import { GenerateStudentBillsDto } from './dto/fee-bill/generate-student-bills.dto';

@ApiTags('Fees')
@ApiBearerAuth('access-token')
@Controller('fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  // ─── FEE TYPES ───────────────────────────────────────────────────────────────

  @Post('types')
  @Permissions(PERMISSION_REGISTRY.fees.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a fee type (Class or Transport)' })
  async createFeeType(
    @Body() dto: CreateFeeTypeDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.feesService.createFeeType(dto, schoolId, userId);
    return ApiResponse.created(data, 'Fee type created successfully');
  }

  @Get('types')
  @Permissions(PERMISSION_REGISTRY.fees.view)
  @ApiOperation({ summary: 'List fee types' })
  async findAllFeeTypes(@GetSchoolId() schoolId: string, @Query() filters: FilterFeeTypeDto) {
    const data = await this.feesService.findAllFeeTypes(schoolId, filters);
    return ApiResponse.success(data.items, 'Fee types fetched successfully', data.meta);
  }

  @Get('types/:id')
  @Permissions(PERMISSION_REGISTRY.fees.view)
  @ApiOperation({ summary: 'Get fee type by ID' })
  async findFeeType(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    const data = await this.feesService.findFeeTypeById(id, schoolId);
    return ApiResponse.success(data, 'Fee type fetched successfully');
  }

  @Patch('types/:id')
  @Permissions(PERMISSION_REGISTRY.fees.update)
  @ApiOperation({ summary: 'Update fee type' })
  async updateFeeType(
    @Param('id') id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateFeeTypeDto,
  ) {
    const data = await this.feesService.updateFeeType(id, schoolId, dto);
    return ApiResponse.success(data, 'Fee type updated successfully');
  }

  @Delete('types/:id')
  @Permissions(PERMISSION_REGISTRY.fees.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete fee type (soft)' })
  async deleteFeeType(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    await this.feesService.deleteFeeType(id, schoolId);
    return ApiResponse.noContent('Fee type deleted successfully');
  }

  // ─── FEE PLANS ───────────────────────────────────────────────────────────────

  @Get('plans')
  @Permissions(PERMISSION_REGISTRY.fees.view)
  @ApiOperation({ summary: 'List fee plans (Regular / PromotionFree / Admission)' })
  async findAllPlans(@GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    await this.feesService.seedFeePlansIfNeeded(schoolId, userId);
    const data = await this.feesService.findAllFeePlans(schoolId);
    return ApiResponse.success(data, 'Fee plans fetched successfully');
  }

  @Patch('plans/:id')
  @Permissions(PERMISSION_REGISTRY.fees.update)
  @ApiOperation({ summary: 'Update fee plan (toggle active / update description)' })
  async updateFeePlan(
    @Param('id') id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateFeePlanDto,
  ) {
    const data = await this.feesService.updateFeePlan(id, schoolId, dto);
    return ApiResponse.success(data, 'Fee plan updated successfully');
  }

  // ─── CLASS FEE STRUCTURE ─────────────────────────────────────────────────────

  @Get('class-structure')
  @Permissions(PERMISSION_REGISTRY.fees.view)
  @ApiOperation({
    summary: 'Get class fee structure for session/plan/class (all fee types with amounts)',
  })
  async findClassStructure(@GetSchoolId() schoolId: string, @Query() dto: FilterClassStructureDto) {
    const data = await this.feesService.findClassStructureForDisplay(schoolId, dto);
    return ApiResponse.success(data, 'Class fee structure fetched successfully');
  }

  @Put('class-structure')
  @Permissions(PERMISSION_REGISTRY.fees.create)
  @ApiOperation({ summary: 'Upsert class fee structure rows' })
  async upsertClassStructure(
    @GetSchoolId() schoolId: string,
    @Body() dto: UpsertClassStructureDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.feesService.upsertClassStructure(schoolId, dto, userId);
    return ApiResponse.success(data, 'Class fee structure saved successfully');
  }

  // ─── TRANSPORT ROUTES ────────────────────────────────────────────────────────

  @Post('transport-routes')
  @Permissions(PERMISSION_REGISTRY.fees.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create transport route' })
  async createRoute(
    @Body() dto: CreateTransportRouteDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.feesService.createTransportRoute(dto, schoolId, userId);
    return ApiResponse.created(data, 'Transport route created successfully');
  }

  @Get('transport-routes')
  @Permissions(PERMISSION_REGISTRY.fees.view)
  @ApiOperation({ summary: 'List transport routes' })
  async findAllRoutes(@GetSchoolId() schoolId: string) {
    const data = await this.feesService.findAllTransportRoutes(schoolId);
    return ApiResponse.success(data, 'Transport routes fetched successfully');
  }

  @Patch('transport-routes/:id')
  @Permissions(PERMISSION_REGISTRY.fees.update)
  @ApiOperation({ summary: 'Update transport route' })
  async updateRoute(
    @Param('id') id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateTransportRouteDto,
  ) {
    const data = await this.feesService.updateTransportRoute(id, schoolId, dto);
    return ApiResponse.success(data, 'Transport route updated successfully');
  }

  @Delete('transport-routes/:id')
  @Permissions(PERMISSION_REGISTRY.fees.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete transport route' })
  async deleteRoute(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    await this.feesService.deleteTransportRoute(id, schoolId);
    return ApiResponse.noContent('Transport route deleted successfully');
  }

  @Get('transport-routes/:id/fees')
  @Permissions(PERMISSION_REGISTRY.fees.view)
  @ApiOperation({ summary: 'Get fee amounts for a transport route' })
  async findRouteFees(
    @Param('id') id: string,
    @GetSchoolId() schoolId: string,
    @Query('academic_year_id') academicYearId: string,
  ) {
    const data = await this.feesService.findRouteFees(id, schoolId, academicYearId);
    return ApiResponse.success(data, 'Route fees fetched successfully');
  }

  @Put('transport-routes/:id/fees')
  @Permissions(PERMISSION_REGISTRY.fees.create)
  @ApiOperation({ summary: 'Upsert fee amounts for a transport route' })
  async upsertRouteFees(
    @Param('id') id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpsertRouteFeeDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.feesService.upsertRouteFees(id, schoolId, dto, userId);
    return ApiResponse.success(data, 'Route fees saved successfully');
  }

  // ─── FEE BILLS ───────────────────────────────────────────────────────────────

  @Get('bills')
  @Permissions(PERMISSION_REGISTRY.fees.view)
  @ApiOperation({ summary: 'List fee bills' })
  async findBills(@GetSchoolId() schoolId: string, @Query() filters: FilterFeeBillDto) {
    const data = await this.feesService.findBills(schoolId, filters);
    return ApiResponse.success(data.items, 'Fee bills fetched successfully', data.meta);
  }

  @Get('bills/student/:studentId')
  @Permissions(PERMISSION_REGISTRY.fees.view)
  @ApiOperation({ summary: 'Get all bills for a student in an academic year' })
  async findStudentBills(
    @Param('studentId') studentId: string,
    @GetSchoolId() schoolId: string,
    @Query('academic_year_id') academicYearId: string,
  ) {
    const data = await this.feesService.findStudentBills(studentId, schoolId, academicYearId);
    return ApiResponse.success(data, 'Student bills fetched successfully');
  }

  @Post('bills')
  @Permissions(PERMISSION_REGISTRY.fees.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a single manual fee bill' })
  async createBill(
    @Body() dto: CreateFeeBillDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.feesService.createBill(dto, schoolId, userId);
    return ApiResponse.created(data, 'Fee bill created successfully');
  }

  @Post('bills/generate-class')
  @Permissions(PERMISSION_REGISTRY.fees.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk generate fee bills for all students in a class' })
  async bulkGenerateClassBills(
    @Body() dto: BulkCreateFeeBillDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.feesService.bulkGenerateClassBills(dto, schoolId, userId);
    return ApiResponse.created(data, `${data.created} bills generated successfully`);
  }

  @Post('bills/generate-for-student')
  @Permissions(PERMISSION_REGISTRY.fees.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate all fee bills for a single student from class fee structure (idempotent)',
  })
  async generateBillsForStudent(
    @Body() dto: GenerateStudentBillsDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.feesService.generateBillsForStudent(dto, schoolId, userId);
    return ApiResponse.created(data, `${data.created} bills generated, ${data.skipped} skipped`);
  }

  @Post('bills/:id/pay')
  @Permissions(PERMISSION_REGISTRY.fees.approve)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Pay a fee bill (auto-creates finance income if income head mapped)' })
  async payBill(
    @Param('id') id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: CreateFeePaymentDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.feesService.payBill(id, schoolId, dto, userId);
    return ApiResponse.created(data, 'Payment recorded successfully');
  }

  @Get('bills/:id/payments')
  @Permissions(PERMISSION_REGISTRY.fees.view)
  @ApiOperation({ summary: 'Get payment history for a bill' })
  async findBillPayments(@Param('id') id: string) {
    const data = await this.feesService.findBillPayments(id);
    return ApiResponse.success(data, 'Bill payments fetched successfully');
  }

  @Delete('bills/payments/:id')
  @Permissions(PERMISSION_REGISTRY.fees.approve)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a payment (reverses paid amount on bill and linked finance income)',
  })
  async deletePayment(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    await this.feesService.deletePayment(id, schoolId);
    return ApiResponse.noContent('Payment deleted successfully');
  }

  // ─── MONTHLY DUES ────────────────────────────────────────────────────────────

  @Get('monthly-dues')
  @Permissions(PERMISSION_REGISTRY.fees.view)
  @ApiOperation({ summary: 'Get monthly dues for all students in a class for a given month' })
  async findMonthlyDues(@GetSchoolId() schoolId: string, @Query() dto: FilterMonthlyDuesDto) {
    const data = await this.feesService.findMonthlyDues(schoolId, dto);
    return ApiResponse.success(data, 'Monthly dues fetched successfully');
  }

  // ─── BULK OPERATIONS ─────────────────────────────────────────────────────────

  @Post('bulk-discount')
  @Permissions(PERMISSION_REGISTRY.fees.approve)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply bulk discount (irreversible)' })
  async bulkDiscount(
    @GetSchoolId() schoolId: string,
    @Body() dto: BulkDiscountDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.feesService.applyBulkDiscount(schoolId, dto, userId);
    return ApiResponse.success(data, `Discount applied to ${data.applied} bills`);
  }

  @Post('bulk-extra')
  @Permissions(PERMISSION_REGISTRY.fees.approve)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add extra payment to existing fee bills in bulk (irreversible)' })
  async bulkExtra(
    @GetSchoolId() schoolId: string,
    @Body() dto: BulkExtraDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.feesService.applyBulkExtra(schoolId, dto, userId);
    return ApiResponse.created(data, `${data.created} extra payment bills created`);
  }

  // ─── DEMAND RECEIPT ──────────────────────────────────────────────────────────

  @Get('demand-receipt')
  @Permissions(PERMISSION_REGISTRY.fees.view)
  @ApiOperation({ summary: 'Get data for printable demand receipts' })
  async getDemandReceipt(@GetSchoolId() schoolId: string, @Query() dto: GenerateDemandReceiptDto) {
    const data = await this.feesService.getDemandReceipt(schoolId, dto);
    return ApiResponse.success(data, 'Demand receipt data fetched successfully');
  }

  // ─── LATE RULES ──────────────────────────────────────────────────────────────

  @Post('late-rules')
  @Permissions(PERMISSION_REGISTRY.fees.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create late payment rule' })
  async createLateRule(
    @Body() dto: CreateFeeLateRuleDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.feesService.createLateRule(dto, schoolId, userId);
    return ApiResponse.created(data, 'Late rule created successfully');
  }

  @Get('late-rules')
  @Permissions(PERMISSION_REGISTRY.fees.view)
  @ApiOperation({ summary: 'List late payment rules' })
  async findAllLateRules(
    @GetSchoolId() schoolId: string,
    @Query('academic_year_id') academicYearId?: string,
  ) {
    const data = await this.feesService.findAllLateRules(schoolId, academicYearId);
    return ApiResponse.success(data, 'Late rules fetched successfully');
  }

  @Patch('late-rules/:id')
  @Permissions(PERMISSION_REGISTRY.fees.update)
  @ApiOperation({ summary: 'Update late payment rule' })
  async updateLateRule(
    @Param('id') id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateFeeLateRuleDto,
  ) {
    const data = await this.feesService.updateLateRule(id, schoolId, dto);
    return ApiResponse.success(data, 'Late rule updated successfully');
  }

  @Delete('late-rules/:id')
  @Permissions(PERMISSION_REGISTRY.fees.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete late payment rule' })
  async deleteLateRule(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    await this.feesService.deleteLateRule(id, schoolId);
    return ApiResponse.noContent('Late rule deleted successfully');
  }
}

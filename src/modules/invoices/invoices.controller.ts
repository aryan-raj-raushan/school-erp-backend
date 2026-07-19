import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateOneTimeChargeDto } from './dto/create-one-time-charge.dto';
import { AddLineItemDto } from './dto/add-line-item.dto';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetCurrentUser } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { BypassRestriction } from '../../common/decorators/bypass-restriction.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { CompanyRole, AuthContext } from '../../shared/enums';
import { JwtPayload } from '../../shared/types/jwt-payload.types';

@ApiTags('Invoices')
@ApiBearerAuth('access-token')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @Roles(
    CompanyRole.SUPER_ADMIN,
    CompanyRole.ADMIN,
    CompanyRole.SUPPORT,
    CompanyRole.SALES,
    CompanyRole.OPERATOR,
  )
  @ApiOperation({
    summary: 'List invoices — company-wide for Super Admin/Operator, scoped otherwise',
  })
  async findAll(@Query() filters: InvoiceFilterDto, @GetCurrentUser() user: JwtPayload) {
    const data = await this.invoicesService.findAll(filters, user.sub, user.role as string);
    return ApiResponse.success(data.items, 'Invoices fetched', data.meta);
  }

  @Get('my')
  @BypassRestriction()
  @ApiOperation({ summary: 'List the current school’s invoices' })
  async findMine(@Query() filters: InvoiceFilterDto, @GetSchoolId() schoolId: string) {
    const data = await this.invoicesService.findMy(schoolId, filters);
    return ApiResponse.success(data.items, 'Invoices fetched', data.meta);
  }

  @Get(':id')
  @BypassRestriction()
  @ApiOperation({ summary: 'Get an invoice with its line items' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetCurrentUser() user: JwtPayload) {
    const data =
      user.context === AuthContext.SCHOOL
        ? await this.invoicesService.findByIdForSchool(id, user.school_id!)
        : await this.invoicesService.findByIdForCompanyUser(id, user.sub, user.role as string);
    return ApiResponse.success(data);
  }

  @Get(':id/pdf')
  @BypassRestriction()
  @ApiOperation({ summary: 'Get (generating if needed) the invoice PDF URL' })
  async getPdf(@Param('id', ParseUUIDPipe) id: string, @GetCurrentUser() user: JwtPayload) {
    if (user.context === AuthContext.SCHOOL) {
      await this.invoicesService.findByIdForSchool(id, user.school_id!);
    } else {
      await this.invoicesService.findByIdForCompanyUser(id, user.sub, user.role as string);
    }
    const pdf_url = await this.invoicesService.getPdfUrl(id);
    return ApiResponse.success({ pdf_url });
  }

  @Post()
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN, CompanyRole.SALES, CompanyRole.OPERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate an invoice for a subscription now (scoped to assigned schools for Sales)',
  })
  async create(@Body() dto: CreateInvoiceDto, @GetCurrentUser() user: JwtPayload) {
    const data = await this.invoicesService.createManual(dto, user.sub, user.role as string);
    return ApiResponse.created(data, 'Invoice generated');
  }

  @Post(':id/line-items')
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN, CompanyRole.SALES, CompanyRole.OPERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add an extra item to an existing (not yet fully paid) invoice',
  })
  async addLineItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddLineItemDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    const data = await this.invoicesService.addLineItem(id, dto, user.sub, user.role as string);
    return ApiResponse.created(data, 'Line item added');
  }
}

@ApiTags('One-Time Charges')
@ApiBearerAuth('access-token')
@Controller('one-time-charges')
export class OneTimeChargesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN, CompanyRole.SALES, CompanyRole.OPERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Attach a one-time charge (RFID/setup/training/...) to a school — billed immediately (scoped to assigned schools for Sales)',
  })
  async create(@Body() dto: CreateOneTimeChargeDto, @GetCurrentUser() user: JwtPayload) {
    const data = await this.invoicesService.createOneTimeCharge(dto, user.sub, user.role as string);
    return ApiResponse.created(data, 'One-time charge added and invoiced');
  }
}

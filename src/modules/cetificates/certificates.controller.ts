import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CertificatesService } from './certificates.service';
import {
  CreateTransferCertificateDto,
  TransferCertificateFilterDto,
  CreateBonafideCertificateDto,
  BonafideCertificateFilterDto,
} from './dto/certificates.dto';

import { ApiResponse } from '../../shared/responses/api-response';
import { GetCurrentUser } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SchoolRole, CompanyRole } from '../../shared/enums';
import { JwtPayload } from '../../shared/types/jwt-payload.types';

@ApiTags('Certificates')
@ApiBearerAuth()
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly svc: CertificatesService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // TRANSFER CERTIFICATE
  // ──────────────────────────────────────────────────────────────────────────

  @Post('transfer')
  @Roles(
    SchoolRole.SCHOOL_ADMIN,
    SchoolRole.PRINCIPAL,
    SchoolRole.TEACHER,
    CompanyRole.SUPER_ADMIN,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Issue a Transfer Certificate — generates PDF and stores it in S3',
  })
  async createTransfer(
    @Body() dto: CreateTransferCertificateDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUser() user: JwtPayload,
  ) {
    const data = await this.svc.createTransferCertificate(dto, schoolId, user.sub);
    return ApiResponse.success(data, 'Transfer certificate issued');
  }

  @Get('transfer')
  @Roles(
    SchoolRole.SCHOOL_ADMIN,
    SchoolRole.PRINCIPAL,
    SchoolRole.TEACHER,
    CompanyRole.SUPER_ADMIN,
  )
  @ApiOperation({
    summary:
      'List Transfer Certificates with filters (search, class, section, academic year, status)',
  })
  async listTransfer(
    @Query() filters: TransferCertificateFilterDto,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.svc.findAllTransfer(schoolId, filters);
    return ApiResponse.success(data, 'Transfer certificates fetched');
  }

  @Get('transfer/:id')
  @Roles(
    SchoolRole.SCHOOL_ADMIN,
    SchoolRole.PRINCIPAL,
    SchoolRole.TEACHER,
    CompanyRole.SUPER_ADMIN,
  )
  @ApiParam({ name: 'id', description: 'Transfer Certificate ID' })
  @ApiOperation({
    summary: 'Get full Transfer Certificate detail — includes pdf_url for inline viewer',
  })
  async getTransferById(
    @Param('id') id: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.svc.findTransferById(id, schoolId);
    return ApiResponse.success(data, 'Transfer certificate fetched');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BONAFIDE CERTIFICATE
  // ──────────────────────────────────────────────────────────────────────────

  @Post('bonafide')
  @Roles(
    SchoolRole.SCHOOL_ADMIN,
    SchoolRole.PRINCIPAL,
    SchoolRole.TEACHER,
    CompanyRole.SUPER_ADMIN,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Issue a Bonafide Certificate — generates PDF and stores it in S3',
  })
  async createBonafide(
    @Body() dto: CreateBonafideCertificateDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUser() user: JwtPayload,
  ) {
    const data = await this.svc.createBonafideCertificate(dto, schoolId, user.sub);
    return ApiResponse.success(data, 'Bonafide certificate issued');
  }

  @Get('bonafide')
  @Roles(
    SchoolRole.SCHOOL_ADMIN,
    SchoolRole.PRINCIPAL,
    SchoolRole.TEACHER,
    CompanyRole.SUPER_ADMIN,
  )
  @ApiOperation({
    summary:
      'List Bonafide Certificates with filters (search, class, section, academic year, status)',
  })
  async listBonafide(
    @Query() filters: BonafideCertificateFilterDto,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.svc.findAllBonafide(schoolId, filters);
    return ApiResponse.success(data, 'Bonafide certificates fetched');
  }

  @Get('bonafide/:id')
  @Roles(
    SchoolRole.SCHOOL_ADMIN,
    SchoolRole.PRINCIPAL,
    SchoolRole.TEACHER,
    CompanyRole.SUPER_ADMIN,
  )
  @ApiParam({ name: 'id', description: 'Bonafide Certificate ID' })
  @ApiOperation({
    summary: 'Get full Bonafide Certificate detail — includes pdf_url for inline viewer',
  })
  async getBonafideById(
    @Param('id') id: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.svc.findBonafideById(id, schoolId);
    return ApiResponse.success(data, 'Bonafide certificate fetched');
  }
}
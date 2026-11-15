import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  Type,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { AppPermission, PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';
import { BULK_IMPORT } from './bulk-import.constants';
import { BulkEntity } from './bulk-import.types';
import { BulkImportService, ExcelFile } from './bulk-import.service';

const FILE_BODY = {
  schema: {
    type: 'object',
    properties: {
      file: { type: 'string', format: 'binary' },
      skip_errors: { type: 'boolean' },
    },
  },
};

const uploadInterceptor = FileInterceptor('file', {
  limits: { fileSize: BULK_IMPORT.MAX_FILE_BYTES, files: 1 },
});

function sendExcel(res: Response, file: ExcelFile) {
  res.setHeader('Content-Type', BULK_IMPORT.MIME_XLSX);
  res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.send(file.buffer);
}

function createBulkImportController(entity: BulkEntity, permission: AppPermission): Type<unknown> {
  @ApiTags('Bulk Import')
  @ApiBearerAuth('access-token')
  @Permissions(permission)
  @Controller(`bulk-import/${entity}`)
  class BulkImportController {
    constructor(private readonly bulkImport: BulkImportService) {}

    @Get('template')
    @ApiOperation({
      summary: `Download the ${entity} import template, pre-filled with school data`,
    })
    async template(@GetSchoolId() schoolId: string, @Res() res: Response) {
      sendExcel(res, await this.bulkImport.template(entity, schoolId));
    }

    @Post('validate')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(uploadInterceptor)
    @ApiConsumes('multipart/form-data')
    @ApiBody(FILE_BODY)
    @ApiOperation({ summary: `Dry-run: validate a ${entity} file and preview every row` })
    async validate(@UploadedFile() file: Express.Multer.File, @GetSchoolId() schoolId: string) {
      const data = await this.bulkImport.validate(entity, file, schoolId);
      return ApiResponse.success(data, 'File validated');
    }

    @Post('report')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(uploadInterceptor)
    @ApiConsumes('multipart/form-data')
    @ApiBody(FILE_BODY)
    @ApiOperation({ summary: `Download the ${entity} file annotated with every problem` })
    async report(
      @UploadedFile() file: Express.Multer.File,
      @GetSchoolId() schoolId: string,
      @Query('errors_only') errorsOnly: string | undefined,
      @Res() res: Response,
    ) {
      sendExcel(res, await this.bulkImport.report(entity, file, schoolId, errorsOnly === 'true'));
    }

    @Post('commit')
    @HttpCode(HttpStatus.ACCEPTED)
    @UseInterceptors(uploadInterceptor)
    @ApiConsumes('multipart/form-data')
    @ApiBody(FILE_BODY)
    @ApiOperation({ summary: `Re-validate and import a ${entity} file in the background` })
    async commit(
      @UploadedFile() file: Express.Multer.File,
      @Body('skip_errors') skipErrors: string | undefined,
      @GetSchoolId() schoolId: string,
      @GetCurrentUserId() userId: string,
    ) {
      const data = await this.bulkImport.startImport(
        entity,
        file,
        schoolId,
        userId,
        skipErrors === 'true',
      );
      return ApiResponse.success(data, 'Import started');
    }

    @Get('jobs/:jobId')
    @ApiOperation({ summary: `Poll a ${entity} import job` })
    async job(@Param('jobId', ParseUUIDPipe) jobId: string, @GetSchoolId() schoolId: string) {
      const data = await this.bulkImport.getJob(entity, schoolId, jobId);
      return ApiResponse.success(data, 'Import status fetched');
    }
  }

  const name = entity.replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase());
  Object.defineProperty(BulkImportController, 'name', { value: `${name}BulkImportController` });
  return BulkImportController;
}

export const BULK_IMPORT_CONTROLLERS = [
  createBulkImportController('students', PERMISSION_REGISTRY.students.create),
  createBulkImportController('staff', PERMISSION_REGISTRY.staff.create),
  createBulkImportController('finance-accounts', PERMISSION_REGISTRY.finance.create),
  createBulkImportController('finance-heads', PERMISSION_REGISTRY.finance.create),
  createBulkImportController('finance-income', PERMISSION_REGISTRY.finance.create),
  createBulkImportController('finance-expenses', PERMISSION_REGISTRY.finance.create),
];

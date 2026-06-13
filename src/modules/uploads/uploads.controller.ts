import {
  Controller,
  Post,
  Delete,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { DeleteUploadDto } from './dto/delete-upload.dto';
import { ApiResponse } from '../../shared/responses/api-response';
import { GetCurrentUser } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CompanyRole } from '../../shared/enums';
import { JwtPayload } from '../../shared/types/jwt-payload.types';

const TEN_MB = 10 * 1024 * 1024;

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload image to S3' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'reference_id', 'reference_type', 'document_type'],
      properties: {
        file: { type: 'string', format: 'binary' },
        reference_id: { type: 'string' },
        reference_type: { type: 'string' },
        document_type: { type: 'string' },
      },
    },
  })
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: TEN_MB })] }),
    )
    file: Express.Multer.File,
    @Body() body: { reference_id?: string; reference_type?: string; document_type?: string },
    @GetSchoolId() schoolId: string,
    @GetCurrentUser() user: JwtPayload,
  ): Promise<ApiResponse<{ url: string; s3Key: string }>> {
    if (!body.reference_id || !body.reference_type || !body.document_type) {
      throw new BadRequestException('reference_id, reference_type, and document_type are required');
    }
    const data = await this.uploadsService.uploadImage(file, schoolId, user.sub, {
      reference_id: body.reference_id,
      reference_type: body.reference_type,
      document_type: body.document_type,
    });
    return ApiResponse.success(data, 'Image uploaded');
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload document to S3' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'reference_id', 'reference_type', 'document_type'],
      properties: {
        file: { type: 'string', format: 'binary' },
        reference_id: { type: 'string' },
        reference_type: { type: 'string' },
        document_type: { type: 'string' },
      },
    },
  })
  async uploadDocument(
    @UploadedFile(
      new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: TEN_MB })] }),
    )
    file: Express.Multer.File,
    @Body() body: { reference_id?: string; reference_type?: string; document_type?: string },
    @GetSchoolId() schoolId: string,
    @GetCurrentUser() user: JwtPayload,
  ): Promise<ApiResponse<{ url: string; s3Key: string }>> {
    if (!body.reference_id || !body.reference_type || !body.document_type) {
      throw new BadRequestException('reference_id, reference_type, and document_type are required');
    }
    const data = await this.uploadsService.uploadDocument(file, schoolId, user.sub, {
      reference_id: body.reference_id,
      reference_type: body.reference_type,
      document_type: body.document_type,
    });
    return ApiResponse.success(data, 'Document uploaded');
  }

  @Delete()
  @Roles(CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete file from S3 (company admin only)' })
  async deleteFile(
    @Body() dto: DeleteUploadDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUser() user: JwtPayload,
  ): Promise<ApiResponse<null>> {
    await this.uploadsService.deleteFile(dto.s3Key, schoolId, user.role as string);
    return ApiResponse.noContent('File deleted');
  }
}

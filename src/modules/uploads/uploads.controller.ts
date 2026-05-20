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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { DeleteUploadDto } from './dto/delete-upload.dto';
import { ApiResponse } from '../../shared/responses/api-response';
import { GetCurrentUser } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SchoolRole, CompanyRole } from '../../shared/enums';
import { JwtPayload } from '../../shared/types/jwt-payload.types';

const TEN_MB = 10 * 1024 * 1024;

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.TEACHER, CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload image to S3' })
  async uploadImage(
    @UploadedFile(new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: TEN_MB })] }))
    file: Express.Multer.File,
    @GetSchoolId() schoolId: string,
    @GetCurrentUser() user: JwtPayload,
  ): Promise<ApiResponse<{ url: string; s3Key: string }>> {
    const data = await this.uploadsService.uploadImage(file, schoolId, user.sub);
    return ApiResponse.success(data, 'Image uploaded');
  }

  @Post('document')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.TEACHER, CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload document to S3' })
  async uploadDocument(
    @UploadedFile(new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: TEN_MB })] }))
    file: Express.Multer.File,
    @GetSchoolId() schoolId: string,
    @GetCurrentUser() user: JwtPayload,
  ): Promise<ApiResponse<{ url: string; s3Key: string }>> {
    const data = await this.uploadsService.uploadDocument(file, schoolId, user.sub);
    return ApiResponse.success(data, 'Document uploaded');
  }

  @Delete()
  @Roles(SchoolRole.SCHOOL_ADMIN, CompanyRole.SUPER_ADMIN, CompanyRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete file from S3' })
  async deleteFile(
    @Body() dto: DeleteUploadDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUser() user: JwtPayload,
  ): Promise<ApiResponse<null>> {
    await this.uploadsService.deleteFile(dto.s3Key, schoolId, user.role as string);
    return ApiResponse.noContent('File deleted');
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { FilterParentDto } from './dto/filter-parent.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Parents')
@ApiBearerAuth('access-token')
@Controller('parent')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Get('bulk/template')
  @Permissions(PERMISSION_REGISTRY.parents.view)
  @ApiOperation({ summary: 'Download parent bulk import template' })
  async getTemplate(@Res() res: Response) {
    const buffer = await this.parentsService.getBulkTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=parent_import_template.xlsx');
    res.send(buffer);
  }

  @Post('bulk/import')
  @Permissions(PERMISSION_REGISTRY.parents.create)
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk import parents via Excel' })
  async bulkImport(
    @UploadedFile() file: Express.Multer.File,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.parentsService.bulkImport(file.buffer, schoolId, userId);
    return ApiResponse.success(data, 'Bulk import job enqueued');
  }

  @Get('bulk/status/:jobId')
  @Permissions(PERMISSION_REGISTRY.parents.view)
  @ApiOperation({ summary: 'Poll bulk parent import job status' })
  async getBulkStatus(@Param('jobId') jobId: string) {
    const data = await this.parentsService.getBulkStatus(jobId);
    return ApiResponse.success(data, 'Job status fetched');
  }

  @Get('student-detail/:id')
  @Permissions(PERMISSION_REGISTRY.parents.view)
  @ApiOperation({ summary: 'Get student details by parentId' })
  async getStudentDetail(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.parentsService.getStudentDetail(id, schoolId);
    return ApiResponse.success(data, 'Student details fetched successfully');
  }

  @Post()
  @Permissions(PERMISSION_REGISTRY.parents.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new parent' })
  async create(
    @Body() dto: CreateParentDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.parentsService.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Parent created successfully');
  }

  @Get()
  @Permissions(PERMISSION_REGISTRY.parents.view)
  @ApiOperation({ summary: 'List all parents (paginated)' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterParentDto) {
    const data = await this.parentsService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Parents fetched successfully', data.meta);
  }

  @Get(':id')
  @Permissions(PERMISSION_REGISTRY.parents.view)
  @ApiOperation({ summary: 'Get parent details by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.parentsService.findById(id, schoolId);
    return ApiResponse.success(data, 'Parent fetched successfully');
  }

  @Put(':id')
  @Permissions(PERMISSION_REGISTRY.parents.update)
  @ApiOperation({ summary: 'Update parent details' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateParentDto,
  ) {
    const data = await this.parentsService.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Parent updated successfully');
  }

  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.parents.update)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete parent' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.parentsService.remove(id, schoolId);
    return ApiResponse.noContent('Parent deleted successfully');
  }

  @Post(':id/link-student/:studentId')
  @Permissions(PERMISSION_REGISTRY.parents.update)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Link parent to student manually' })
  async linkStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @GetSchoolId() schoolId: string,
  ) {
    await this.parentsService.linkStudent(id, studentId, schoolId);
    return ApiResponse.success(null, 'Parent linked to student successfully');
  }
}

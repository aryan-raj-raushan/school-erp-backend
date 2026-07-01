import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClassSubjectTeacherService } from './class-subject-teacher.service';
import { UpsertClassSubjectTeachersDto } from './dto/upsert-class-subject-teachers.dto';
import { FilterClassSubjectTeacherDto } from './dto/filter-class-subject-teacher.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Class Subject Teachers')
@ApiBearerAuth('access-token')
@Controller('class-subject-teachers')
export class ClassSubjectTeacherController {
  constructor(private readonly service: ClassSubjectTeacherService) {}

  @Get()
  @Permissions(PERMISSION_REGISTRY.classSubjectTeachers.view)
  @ApiOperation({ summary: 'Get the subject-teacher mapping for a class in an academic year' })
  async findForClass(
    @GetSchoolId() schoolId: string,
    @Query() filters: FilterClassSubjectTeacherDto,
  ) {
    const data = await this.service.findForClass(
      schoolId,
      filters.academic_year_id,
      filters.class_id,
    );
    return ApiResponse.success(data, 'Class subject-teacher mapping fetched successfully');
  }

  @Put()
  @Permissions(PERMISSION_REGISTRY.classSubjectTeachers.update)
  @ApiOperation({ summary: 'Replace the subject-teacher mapping for a class in one call' })
  async replaceForClass(
    @Body() dto: UpsertClassSubjectTeachersDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.replaceForClass(dto, schoolId, userId);
    return ApiResponse.success(data, 'Class subject-teacher mapping saved successfully');
  }

  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.classSubjectTeachers.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a single subject-teacher mapping row' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.service.remove(id, schoolId);
    return ApiResponse.noContent('Mapping removed successfully');
  }
}

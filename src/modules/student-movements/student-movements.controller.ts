import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StudentMovementsService, CreateMovementDto } from './student-movements.service';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

class CreateMovementDtoClass implements CreateMovementDto {
  @ApiProperty() @IsString() student_id: string;
  @ApiProperty() @IsDateString() date: string;
  @ApiProperty() @IsString() tapped_at: string;
  @ApiProperty({ enum: ['CAMPUS', 'LIBRARY', 'MEDICAL_ROOM', 'SPORTS', 'CANTEEN', 'GATE', 'HOSTEL', 'LAB'] })
  @IsEnum(['CAMPUS', 'LIBRARY', 'MEDICAL_ROOM', 'SPORTS', 'CANTEEN', 'GATE', 'HOSTEL', 'LAB'])
  location: CreateMovementDto['location'];
  @ApiProperty({ required: false }) @IsOptional() @IsString() device_id?: string;
}

@ApiTags('Student Movements')
@ApiBearerAuth('access-token')
@Controller('student-movements')
export class StudentMovementsController {
  constructor(private readonly service: StudentMovementsService) {}

  @Get()
  @ApiOperation({ summary: 'List student movements with optional filters' })
  @ApiQuery({ name: 'student_id', required: false })
  @ApiQuery({ name: 'date', required: false })
  async findAll(
    @GetSchoolId() schoolId: string,
    @Query('student_id') studentId?: string,
    @Query('date') date?: string,
  ) {
    const data = await this.service.findAll(schoolId, { student_id: studentId, date });
    return ApiResponse.success(data, 'Movements fetched');
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Movement timeline for a student on a date' })
  @ApiQuery({ name: 'date', required: false })
  async byStudent(
    @GetSchoolId() schoolId: string,
    @Param('studentId') studentId: string,
    @Query('date') date?: string,
  ) {
    const data = await this.service.findByStudent(studentId, schoolId, date);
    return ApiResponse.success(data, 'Timeline fetched');
  }

  @Post()
  @Permissions(PERMISSION_REGISTRY.attendance.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log a student movement (manual / device)' })
  async create(@Body() dto: CreateMovementDtoClass, @GetSchoolId() schoolId: string) {
    const data = await this.service.create(dto, schoolId);
    return ApiResponse.created(data, 'Movement logged');
  }

  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.attendance.update)
  @ApiOperation({ summary: 'Delete a movement record' })
  async remove(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    await this.service.remove(id, schoolId);
    return ApiResponse.success(null, 'Deleted');
  }
}

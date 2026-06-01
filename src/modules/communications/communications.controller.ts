import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';
import { SendNotificationDto, SendCommunicationDto, ReviewCommunicationDto } from './dto/communication.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { SchoolRole } from '../../shared/enums';

const ALL_ROLES = [SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.VICE_PRINCIPAL, SchoolRole.TEACHER, SchoolRole.CLASS_TEACHER, SchoolRole.ACCOUNTANT, SchoolRole.LIBRARIAN];

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly commsService: CommunicationsService) {}

  @Post()
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.VICE_PRINCIPAL, SchoolRole.TEACHER, SchoolRole.CLASS_TEACHER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a notification' })
  async send(@Body() dto: SendNotificationDto, @GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    return ApiResponse.created(await this.commsService.sendNotification(dto, schoolId, userId), 'Notification sent');
  }

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Get notifications for calling user' })
  async findMine(@GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    return ApiResponse.success(await this.commsService.getNotificationsForUser(userId, schoolId), 'Notifications fetched');
  }

  @Get('sent')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'List notifications sent by calling user' })
  async findSent(@GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    return ApiResponse.success(await this.commsService.getSentByUser(userId, schoolId), 'Sent notifications fetched');
  }

  @Patch('read-all')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Mark all unread notifications as read' })
  async markAllRead(@GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    await this.commsService.markAllRead(userId, schoolId);
    return ApiResponse.success(null, 'All notifications marked as read');
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Get single notification (auto-mark read)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(await this.commsService.getNotificationById(id, schoolId), 'Notification fetched');
  }

  @Delete(':id')
  @Roles(...ALL_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a notification' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.commsService.deleteNotification(id, schoolId);
    return ApiResponse.noContent('Notification deleted');
  }

  @Patch(':id/read')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Mark specific notification as read' })
  async markRead(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(await this.commsService.markNotificationRead(id, schoolId), 'Notification marked as read');
  }
}

@ApiTags('Communications')
@ApiBearerAuth('access-token')
@Controller('communications')
export class CommunicationController {
  constructor(private readonly commsService: CommunicationsService) {}

  @Post()
  @Roles(...ALL_ROLES)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a communication / request' })
  async send(@Body() dto: SendCommunicationDto, @GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    return ApiResponse.created(await this.commsService.sendCommunication(dto, schoolId, userId), 'Communication sent');
  }

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'List communications (sent/received/all)' })
  @ApiQuery({ name: 'view', required: false, enum: ['sent', 'received', 'all'] })
  async findAll(@GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string, @Query('view') view: 'sent' | 'received' | 'all' = 'all') {
    return ApiResponse.success(await this.commsService.getCommunications(schoolId, userId, view), 'Communications fetched');
  }

  @Get('pending-summary')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Count pending requests (dashboard badge)' })
  async pendingSummary(@GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    return ApiResponse.success(await this.commsService.getPendingSummary(userId, schoolId), 'Pending count fetched');
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Get single communication (auto-mark read)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(await this.commsService.getCommunicationById(id, schoolId), 'Communication fetched');
  }

  @Patch(':id')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Approve / reject / reply to communication' })
  async review(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string, @Body() dto: ReviewCommunicationDto) {
    return ApiResponse.success(await this.commsService.reviewCommunication(id, schoolId, userId, dto), 'Communication updated');
  }
}

const ALL_ROLES_COMMS = ALL_ROLES;

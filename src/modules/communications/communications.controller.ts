import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';
import {
  SendNotificationDto,
  SendCommunicationDto,
  ReviewCommunicationDto,
} from './dto/communication.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId, GetCurrentUser } from '../../common/decorators/current-user.decorator';
import { ParentAccessible } from '../../common/decorators/parent-accessible.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';
import { RequestUser } from '../../shared/types/jwt-payload.types';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly commsService: CommunicationsService) {}

  @Post()
  @Permissions(PERMISSION_REGISTRY.communications.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a notification' })
  async send(
    @Body() dto: SendNotificationDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    return ApiResponse.created(
      await this.commsService.sendNotification(dto, schoolId, userId),
      'Notification sent',
    );
  }

  @Get()
  @ParentAccessible()
  @ApiOperation({ summary: 'Get notifications for calling user' })
  async findMine(@GetSchoolId() schoolId: string, @GetCurrentUser() user: RequestUser) {
    return ApiResponse.success(
      await this.commsService.getNotificationsForUser(user.sub, schoolId, user.role),
      'Notifications fetched',
    );
  }

  @Get('sent')
  @ApiOperation({ summary: 'List notifications sent by calling user' })
  async findSent(@GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    return ApiResponse.success(
      await this.commsService.getSentByUser(userId, schoolId),
      'Sent notifications fetched',
    );
  }

  @Patch('read-all')
  @ParentAccessible()
  @ApiOperation({ summary: 'Mark all unread notifications as read' })
  async markAllRead(@GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    await this.commsService.markAllRead(userId, schoolId);
    return ApiResponse.success(null, 'All notifications marked as read');
  }

  @Get(':id')
  @ParentAccessible()
  @ApiOperation({ summary: 'Get single notification (auto-mark read)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(
      await this.commsService.getNotificationById(id, schoolId),
      'Notification fetched',
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a notification' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.commsService.deleteNotification(id, schoolId);
    return ApiResponse.noContent('Notification deleted');
  }

  @Patch(':id/read')
  @ParentAccessible()
  @ApiOperation({ summary: 'Mark specific notification as read' })
  async markRead(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(
      await this.commsService.markNotificationRead(id, schoolId),
      'Notification marked as read',
    );
  }
}

@ApiTags('Communications')
@ApiBearerAuth('access-token')
@Controller('communications')
export class CommunicationController {
  constructor(private readonly commsService: CommunicationsService) {}

  @Post()
  @Permissions(PERMISSION_REGISTRY.communications.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a communication / request' })
  async send(
    @Body() dto: SendCommunicationDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    return ApiResponse.created(
      await this.commsService.sendCommunication(dto, schoolId, userId),
      'Communication sent',
    );
  }

  @Get()
  @ApiOperation({ summary: 'List communications (sent/received/all)' })
  @ApiQuery({ name: 'view', required: false, enum: ['sent', 'received', 'all'] })
  async findAll(
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
    @Query('view') view: 'sent' | 'received' | 'all' = 'all',
  ) {
    return ApiResponse.success(
      await this.commsService.getCommunications(schoolId, userId, view),
      'Communications fetched',
    );
  }

  @Get('pending-summary')
  @ApiOperation({ summary: 'Count pending requests (dashboard badge)' })
  async pendingSummary(@GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    return ApiResponse.success(
      await this.commsService.getPendingSummary(userId, schoolId),
      'Pending count fetched',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single communication (auto-mark read)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    return ApiResponse.success(
      await this.commsService.getCommunicationById(id, schoolId),
      'Communication fetched',
    );
  }

  @Patch(':id')
  @Permissions(PERMISSION_REGISTRY.communications.update)
  @ApiOperation({ summary: 'Approve / reject / reply to communication' })
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: ReviewCommunicationDto,
  ) {
    return ApiResponse.success(
      await this.commsService.reviewCommunication(id, schoolId, userId, dto),
      'Communication updated',
    );
  }
}

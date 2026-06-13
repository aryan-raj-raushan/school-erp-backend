import { Controller, Post, Param, Body, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

class VerifyTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;
}

@ApiTags('Staff Invites')
@ApiBearerAuth('access-token')
@Controller('invite')
export class InviteController {
  constructor(private readonly staffService: StaffService) {}

  @Post('verify-token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a school user invitation token' })
  async verifyToken(@Body() dto: VerifyTokenDto) {
    const data = await this.staffService.verifyInviteToken(dto.token);
    return ApiResponse.success(data, 'Invite token is valid');
  }

  @Post('resend/:userId')
  @Permissions(PERMISSION_REGISTRY.staff.update)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend a school user invitation' })
  async resendInvite(
    @Param('userId', ParseUUIDPipe) userId: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.staffService.resendInvite(userId, schoolId);
    return ApiResponse.success(data, 'Invite resent successfully');
  }
}

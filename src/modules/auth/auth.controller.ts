import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { LoginCompanyDto } from './dto/login-company.dto';
import { LoginSchoolDto } from './dto/login-school.dto';
import { LoginUnifiedDto } from './dto/login-unified.dto';
import { SetupPasswordDto } from './dto/setup-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SchoolSignupDto } from './dto/school-signup.dto';
import { Public } from '../../common/decorators/public.decorator';
import { BypassRestriction } from '../../common/decorators/bypass-restriction.decorator';
import { GetCurrentUser, GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { RefreshTokenGuard } from '../../common/guards/refresh-token.guard';
import { K6 } from '../../common/decorators/k6.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { AuthContext } from '../../shared/enums';
import { RefreshTokenPayload } from '../../shared/types/jwt-payload.types';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('school/signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Self-register a school + SCHOOL_ADMIN in one step. Returns tokens immediately.',
  })
  async schoolSignup(@Body() dto: SchoolSignupDto) {
    const result = await this.authService.schoolSignup(dto);
    return ApiResponse.created(result, 'School registered successfully');
  }

  @Public()
  @Post('company/register')
  @ApiOperation({
    summary: 'Register a company user. SUPER_ADMIN requires X-Bootstrap-Secret header.',
  })
  @ApiHeader({
    name: 'x-bootstrap-secret',
    description: 'Required when creating SUPER_ADMIN',
    required: false,
  })
  async registerCompany(
    @Body() dto: RegisterCompanyDto,
    @Headers('x-bootstrap-secret') bootstrapSecret?: string,
  ) {
    const user = await this.authService.registerCompany(dto, bootstrapSecret);
    return ApiResponse.created(user, 'Company user registered successfully');
  }

  @Public()
  @Post('company/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Company user login' })
  async loginCompany(@Body() dto: LoginCompanyDto) {
    const result = await this.authService.loginCompany(dto);
    return ApiResponse.success(result, 'Login successful');
  }

  @Public()
  @Post('school/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'School user login (phone + password)' })
  async loginSchool(@Body() dto: LoginSchoolDto) {
    const result = await this.authService.loginSchool(dto);
    return ApiResponse.success(result, 'Login successful');
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Unified login — company (email) or school (email/phone). Returns needs_password_setup:true + setup_token when school admin has no password set.',
  })
  async loginUnified(@Body() dto: LoginUnifiedDto) {
    const result = await this.authService.loginUnified(dto);
    return ApiResponse.success(result, 'Login successful');
  }

  @Public()
  @Post('school/setup-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'School admin first-time password setup using setup_token from login response',
  })
  async setupPassword(@Body() dto: SetupPasswordDto) {
    const result = await this.authService.setupPassword(dto);
    return ApiResponse.success(result, 'Password set successfully');
  }

  @Public()
  @Post('school/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Forced first-login password change using change_token from login response (must_change_password:true)',
  })
  async changePassword(@Body() dto: ChangePasswordDto) {
    const result = await this.authService.changePassword(dto);
    return ApiResponse.success(result, 'Password changed successfully');
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@GetCurrentUser() user: RefreshTokenPayload) {
    const tokens = await this.authService.refresh(user.sub, user.token_id, user.context);
    return ApiResponse.success(tokens, 'Tokens refreshed');
  }

  @Post('switch-school/:schoolId')
  @BypassRestriction()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Switch into a school context — SUPER_ADMIN/OPERATOR: any school, others: assigned schools only',
  })
  @K6({ authContext: 'company', paramSources: { schoolId: '/api/v1/schools' } })
  async switchSchool(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const result = await this.authService.switchSchool(userId, schoolId);
    return ApiResponse.success(result, 'Switched to school context');
  }

  @Post('logout')
  @BypassRestriction()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout — invalidates all refresh tokens for user' })
  async logout(@GetCurrentUser() user: { sub: string; token_id?: string }, @Req() req: Request) {
    const authHeader = req.headers['authorization'] ?? '';
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    await this.authService.logout(user.sub, user.token_id ?? '', rawToken);
    return ApiResponse.noContent('Logged out successfully');
  }

  @Get('me')
  @BypassRestriction()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user profile with permissions' })
  async getMe(
    @GetCurrentUserId() userId: string,
    @GetCurrentUser() user: { context: AuthContext; role: string; school_id?: string },
    @GetSchoolId() schoolId: string,
  ) {
    const profile = await this.authService.getMe(userId, user.context, user.role, schoolId);
    return ApiResponse.success(profile);
  }
}

import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { LoginCompanyDto } from './dto/login-company.dto';
import { LoginSchoolDto } from './dto/login-school.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/public.decorator';
import { GetCurrentUser, GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { RefreshTokenGuard } from '../../common/guards/refresh-token.guard';
import { ApiResponse } from '../../shared/responses/api-response';
import { AuthContext } from '../../shared/enums';
import { RefreshTokenPayload } from '../../shared/types/jwt-payload.types';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('company/register')
  @ApiOperation({ summary: 'Register a company user (SUPER_ADMIN only in prod)' })
  async registerCompany(@Body() dto: RegisterCompanyDto) {
    const user = await this.authService.registerCompany(dto);
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
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@GetCurrentUser() user: RefreshTokenPayload) {
    const tokens = await this.authService.refresh(user.sub, user.token_id, user.context);
    return ApiResponse.success(tokens, 'Tokens refreshed');
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout — invalidates all refresh tokens for user' })
  async logout(
    @GetCurrentUser() user: { sub: string; token_id?: string },
    @Req() req: Request,
  ) {
    const authHeader = req.headers['authorization'] ?? '';
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    await this.authService.logout(user.sub, user.token_id ?? '', rawToken);
    return ApiResponse.noContent('Logged out successfully');
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(
    @GetCurrentUserId() userId: string,
    @GetCurrentUser() user: { context: AuthContext },
  ) {
    const profile = await this.authService.getMe(userId, user.context);
    return ApiResponse.success(profile);
  }
}

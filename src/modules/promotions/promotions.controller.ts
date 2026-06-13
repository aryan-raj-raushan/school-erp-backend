import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { PromoteStudentsDto } from './dto/promote-students.dto';
import { PromotionFilterDto } from './dto/promotion-filter.dto';
import { ApiResponse, PaginationResponse } from '../../shared/responses/api-response';
import { PromotionLog } from './types/promotion.types';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetCurrentUser } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { JwtPayload } from '../../shared/types/jwt-payload.types';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Promotions')
@ApiBearerAuth()
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post('bulk')
  @Permissions(PERMISSION_REGISTRY.students.update)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk promote students to a new academic year' })
  async bulkPromote(
    @GetSchoolId() schoolId: string,
    @GetCurrentUser() user: JwtPayload,
    @Body() dto: PromoteStudentsDto,
  ): Promise<ApiResponse<{ batchId: string; promoted: number; failed: number }>> {
    const result = await this.promotionsService.bulkPromote(schoolId, dto, user.sub);
    const { batchId, promoted, failed } = result;
    return ApiResponse.success(
      { batchId, promoted, failed },
      `Promoted ${promoted} student(s). Failed: ${failed}.`,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List promotion logs' })
  async findAll(
    @GetSchoolId() schoolId: string,
    @Query() filters: PromotionFilterDto,
  ): Promise<ApiResponse<PaginationResponse<PromotionLog>>> {
    const data = await this.promotionsService.findAll(schoolId, filters);
    return ApiResponse.success(data, 'Promotion logs fetched');
  }
}

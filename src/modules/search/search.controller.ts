import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../shared/types/jwt-payload.types';
import { ApiResponse } from '../../shared/responses/api-response';

@ApiTags('Search')
@ApiBearerAuth('access-token')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global fuzzy search across all accessible modules' })
  @ApiQuery({ name: 'q', required: true, description: 'Search term (min 2 chars)' })
  async search(
    @Query('q') q: string,
    @GetSchoolId() schoolId: string,
    @GetCurrentUser() user: RequestUser,
  ) {
    const query = (q ?? '').trim();

    if (query.length < 2) {
      return ApiResponse.success(
        {
          students: [],
          staff: [],
          parents: [],
          admissions: [],
          classes: [],
          subjects: [],
          departments: [],
          feeTypes: [],
          events: [],
          academicYears: [],
          homework: [],
          query,
        },
        'Search results',
      );
    }

    const data = await this.searchService.globalSearch(
      query,
      schoolId,
      user.sub,
      user.custom_role_id,
      user.role as string,
    );

    return ApiResponse.success(data, 'Search results');
  }
}

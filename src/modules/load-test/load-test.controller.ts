import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { LoadTestService } from './load-test.service';

@ApiTags('Load Test')
@Controller('load-test.js')
export class LoadTestController {
  constructor(private readonly loadTestService: LoadTestService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Generate k6 load test script from current API routes' })
  @ApiQuery({ name: 'scenario', enum: ['smoke', 'full'], required: false })
  generate(
    @Query('scenario') scenario: 'smoke' | 'full' = 'smoke',
    @Res() res: Response,
  ): void {
    const script = this.loadTestService.generate(scenario);
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Content-Disposition', 'attachment; filename="load-test.js"');
    res.send(script);
  }
}

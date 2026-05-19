import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { RedisService } from '../redis/redis.service';
import { Public } from '../../common/decorators/public.decorator';
import { sql } from 'drizzle-orm';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly redisService: RedisService,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Basic health check' })
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check — verifies all DB connections' })
  async ready() {
    const checks: Record<string, string> = {};

    try {
      await this.db.execute(sql`SELECT 1`);
      checks.postgres = 'connected';
    } catch {
      checks.postgres = 'error';
    }

    try {
      const pong = await this.redisService.ping();
      checks.redis = pong === 'PONG' ? 'connected' : 'error';
    } catch {
      checks.redis = 'error';
    }

    try {
      checks.mongo =
        this.mongoConnection.readyState === 1 ? 'connected' : 'error';
    } catch {
      checks.mongo = 'error';
    }

    const allOk = Object.values(checks).every((v) => v === 'connected');

    return {
      status: allOk ? 'ready' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}

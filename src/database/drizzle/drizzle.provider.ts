import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { DRIZZLE_ORM } from './drizzle.constants';

const drizzleLogger = new Logger('Drizzle');

export type DrizzleDB = NodePgDatabase<typeof schema>;

// Ping Neon every 4 minutes so it never cold-starts during active sessions.
// Neon free tier suspends after ~5 min of inactivity → 2-4s cold start on next query.
function startNeonKeepAlive(pool: Pool): void {
  const log = new Logger('NeonKeepAlive');
  setInterval(
    async () => {
      try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        log.debug('keep-alive ping OK');
      } catch (e) {
        log.warn(`keep-alive ping failed: ${e}`);
      }
    },
    4 * 60 * 1000,
  ); // 4 minutes
}

export const drizzleProvider = {
  provide: DRIZZLE_ORM,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService): Promise<DrizzleDB> => {
    const dbConfig = configService.get('database.postgres');

    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      min: 2, // keep 2 warm connections — avoids TLS handshake on every request
      max: dbConfig.poolMax ?? 10,
      idleTimeoutMillis: 300000, // 5 min — outlasts Neon's 5-min suspend window
      connectionTimeoutMillis: 15000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error', err);
    });

    // Warm up Neon immediately on bootstrap — prevents cold start on first user request
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      drizzleLogger.log('Neon warm-up OK');
    } catch (e) {
      drizzleLogger.warn(`Neon warm-up failed: ${e}`);
    }

    startNeonKeepAlive(pool);

    return drizzle(pool, {
      schema,
      logger:
        process.env.NODE_ENV !== 'production'
          ? {
              logQuery(query, params) {
                drizzleLogger.debug(`[SQL] ${query} | params: ${JSON.stringify(params)}`);
              },
            }
          : undefined,
    });
  },
};

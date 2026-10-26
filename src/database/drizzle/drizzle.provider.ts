import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { DRIZZLE_ORM } from './drizzle.constants';

const drizzleLogger = new Logger('Drizzle');

export type DrizzleDB = NodePgDatabase<typeof schema>;

export const drizzleProvider = {
  provide: DRIZZLE_ORM,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService): Promise<DrizzleDB> => {
    const dbConfig = configService.get('database.postgres');

    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
      connectionString,
      ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
      min: 2,
      max: dbConfig.poolMax ?? 10,
      idleTimeoutMillis: 300000,
      connectionTimeoutMillis: 15000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error', err);
    });

    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      drizzleLogger.log('PostgreSQL connection OK');
    } catch (e) {
      drizzleLogger.warn(`PostgreSQL connection check failed: ${e}`);
    }

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

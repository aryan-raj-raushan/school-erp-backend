import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { DRIZZLE_ORM } from './drizzle.constants';

export type DrizzleDB = NodePgDatabase<typeof schema>;

export const drizzleProvider = {
  provide: DRIZZLE_ORM,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService): Promise<DrizzleDB> => {
    const dbConfig = configService.get('database.postgres');

    const pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
      min: dbConfig.poolMin,
      max: dbConfig.poolMax,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error', err);
    });

    return drizzle(pool, { schema, logger: process.env.NODE_ENV === 'development' });
  },
};

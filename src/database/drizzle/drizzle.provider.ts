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

    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      min: dbConfig.poolMin ?? 2,
      max: dbConfig.poolMax ?? 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error', err);
    });

    return drizzle(pool, { schema, logger: process.env.NODE_ENV === 'development' });
  },
};

import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  postgres: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    database: process.env.PG_DATABASE || 'school_erp',
    ssl: process.env.PG_SSL === 'true',
    poolMin: parseInt(process.env.PG_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.PG_POOL_MAX || '20', 10),
    url: process.env.DATABASE_URL || '',
  },
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/school_erp_logs',
    dbName: process.env.MONGO_DB_NAME || 'school_erp_logs',
  },
}));

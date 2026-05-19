import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  name: process.env.APP_NAME || 'school-erp-backend',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3001').split(','),
  rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  allowedMimeTypes: (
    process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp,application/pdf'
  ).split(','),
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
    path: process.env.SWAGGER_PATH || 'api/docs',
    title: process.env.SWAGGER_TITLE || 'School ERP API',
    version: process.env.SWAGGER_VERSION || '1.0.0',
  },
}));

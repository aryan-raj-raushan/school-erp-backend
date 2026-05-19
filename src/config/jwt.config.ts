import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET || 'change_me_access_secret_32_chars',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'change_me_refresh_secret_32_chars',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}));

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import express from 'express';
import { decode } from '@msgpack/msgpack';

import { AppModule } from './app.module';
import { LoadTestService } from './modules/load-test/load-test.service';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { CustomValidationPipe } from './common/pipes/validation.pipe';

const IMPORT_JOB_POLL_PATH = /\/bulk-import\/[\w-]+\/jobs\/[\w-]+$/;

const CREDENTIAL_AUTH_PATHS = new Set([
  '/login',
  '/company/login',
  '/school/login',
  '/parent/login',
  '/school/signup',
  '/company/register',
  '/school/change-password',
  '/parent/change-password',
]);

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

// Behind Cloudflare -> local nginx, every request arrives from loopback; the real client is in
// CF-Connecting-IP. Direct hits on the public port are keyed by socket address so the header can't be spoofed.
function clientIp(req: express.Request): string {
  const viaLocalProxy = LOOPBACK_ADDRESSES.has(req.socket.remoteAddress ?? '');
  const cfIp = req.headers['cf-connecting-ip'];
  if (viaLocalProxy && typeof cfIp === 'string' && cfIp) return cfIp;
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });

  const logger = new Logger('Bootstrap');

  app.set('trust proxy', 'loopback');

  // CORS goes first so early rejections (bad body, rate limit) still reach the browser readably.
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Type'],
  });

  // Body parsers before helmet — msgpack raw body must be buffered before any other middleware.
  // `verify` stashes the raw bytes on the request too — needed by the Razorpay webhook to
  // recompute the HMAC signature over the exact payload Razorpay signed, not our re-serialized JSON.
  app.use(
    express.json({
      limit: '10mb',
      verify: (req: express.Request & { rawBody?: Buffer }, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.headers['content-type'] === 'application/msgpack') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        try {
          req.body = decode(Buffer.concat(chunks));
        } catch {
          res
            .status(400)
            .json({ success: false, statusCode: 400, message: 'Invalid msgpack body' });
          return;
        }
        next();
      });
    } else {
      next();
    }
  });

  app.use(helmet());
  app.use(compression());

  app.use(
    rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      keyGenerator: clientIp,
      skip: (req) => req.method === 'GET' && IMPORT_JOB_POLL_PATH.test(req.path),
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        statusCode: 429,
        message: 'Too many requests, please try again later',
      },
    }),
  );

  // Stricter limit only where a password is checked; refresh, me, logout etc. stay on the general limit.
  app.use(
    `/${process.env.API_PREFIX || 'api/v1'}/auth`,
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
      keyGenerator: clientIp,
      skip: (req) => !CREDENTIAL_AUTH_PATHS.has(req.path),
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        statusCode: 429,
        message: 'Too many authentication attempts, please try again later',
      },
    }),
  );

  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health', 'ready'],
  });

  app.useGlobalPipes(CustomValidationPipe);
  app.useGlobalFilters(new GlobalExceptionFilter());

  if (process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(process.env.SWAGGER_TITLE || 'School ERP API')
      .setDescription('Multi-tenant School ERP SaaS Backend')
      .setVersion(process.env.SWAGGER_VERSION || '1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Schools', 'School management')
      .addTag('Academic Years', 'Academic year management')
      .addTag('Classes', 'Class management')
      .addTag('Sections', 'Section management')
      .addTag('Subjects', 'Subject management')
      .addTag('Students', 'Student management')
      .addTag('Subscriptions', 'Subscription & billing')
      .addTag('Promotions', 'Student promotions')
      .addTag('Uploads', 'File uploads')
      .addTag('Health', 'Health checks')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(process.env.SWAGGER_PATH || 'api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    app.get(LoadTestService).setDocument(document);
  }

  app.enableShutdownHooks();

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}`);
  logger.log(`API prefix: /${apiPrefix}`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`Swagger docs: http://localhost:${port}/${process.env.SWAGGER_PATH || 'api/docs'}`);
  }
}

void bootstrap();

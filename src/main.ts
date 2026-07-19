import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import express from 'express';
import { decode } from '@msgpack/msgpack';

import { AppModule } from './app.module';
import { LoadTestService } from './modules/load-test/load-test.service';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { CustomValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });

  const logger = new Logger('Bootstrap');

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

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Type'],
  });

  app.use(
    rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        statusCode: 429,
        message: 'Too many requests, please try again later',
      },
    }),
  );

  // Stricter rate limit for auth endpoints (brute-force protection)
  app.use(
    `/${process.env.API_PREFIX || 'api/v1'}/auth`,
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
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

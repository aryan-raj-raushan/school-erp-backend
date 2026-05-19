import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { appConfig, databaseConfig, redisConfig, jwtConfig, awsConfig } from './config';
import { DrizzleModule } from './database/drizzle/drizzle.module';
import { MongoModule } from './database/mongo/mongo.module';
import { RedisModule } from './modules/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { AcademicYearsModule } from './modules/academic-years/academic-years.module';
import { ClassesModule } from './modules/classes/classes.module';
import { SectionsModule } from './modules/sections/sections.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { StudentsModule } from './modules/students/students.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, awsConfig],
      envFilePath: ['.env', '.env.local'],
    }),
    ScheduleModule.forRoot(),
    DrizzleModule,
    MongoModule,
    RedisModule,
    HealthModule,
    AuthModule,
    SchoolsModule,
    AcademicYearsModule,
    ClassesModule,
    SectionsModule,
    SubjectsModule,
    StudentsModule,
    SubscriptionsModule,
    PromotionsModule,
    UploadsModule,
    SchedulerModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useValue: new TimeoutInterceptor(30_000) },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionExpiryTask } from './tasks/subscription-expiry.task';
import { DrizzleModule } from '../../database/drizzle/drizzle.module';
import { RedisModule } from '../redis/redis.module';
import { NotificationLog, NotificationLogSchema } from '../../database/mongo/schemas/notification-log.schema';

@Module({
  imports: [
    DrizzleModule,
    RedisModule,
    MongooseModule.forFeature([{ name: NotificationLog.name, schema: NotificationLogSchema }]),
  ],
  providers: [SubscriptionExpiryTask],
})
export class SchedulerModule {}

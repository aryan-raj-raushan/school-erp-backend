import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionExpiryTask } from './tasks/subscription-expiry.task';
import { LeaveBalanceTask } from './tasks/leave-balance.task';
import { InvoiceGenerationTask } from './tasks/invoice-generation.task';
import { RestrictionEnforcementTask } from './tasks/restriction-enforcement.task';
import { SchedulerController } from './scheduler.controller';
import { DrizzleModule } from '../../database/drizzle/drizzle.module';
import { RedisModule } from '../redis/redis.module';
import { InvoicesModule } from '../invoices/invoices.module';
import {
  NotificationLog,
  NotificationLogSchema,
} from '../../database/mongo/schemas/notification-log.schema';

@Module({
  imports: [
    DrizzleModule,
    RedisModule,
    InvoicesModule,
    MongooseModule.forFeature([{ name: NotificationLog.name, schema: NotificationLogSchema }]),
  ],
  controllers: [SchedulerController],
  providers: [
    SubscriptionExpiryTask,
    LeaveBalanceTask,
    InvoiceGenerationTask,
    RestrictionEnforcementTask,
  ],
})
export class SchedulerModule {}

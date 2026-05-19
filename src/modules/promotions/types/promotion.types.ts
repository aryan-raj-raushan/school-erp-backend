import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { promotionLogs } from '../../../database/drizzle/schema/promotion-logs.schema';

export type PromotionLog = InferSelectModel<typeof promotionLogs>;
export type NewPromotionLog = InferInsertModel<typeof promotionLogs>;

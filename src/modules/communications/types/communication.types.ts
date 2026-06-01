import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { notifications, communications } from '../../../database/drizzle/schema/communications.schema';

export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;

export type Communication = InferSelectModel<typeof communications>;
export type NewCommunication = InferInsertModel<typeof communications>;

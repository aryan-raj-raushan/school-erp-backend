import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationLogDocument = NotificationLog & Document;

@Schema({ collection: 'notification_logs', timestamps: true })
export class NotificationLog {
  @Prop({ required: true, index: true })
  school_id: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  event: string;

  @Prop({ required: true, index: true })
  recipient_id: string;

  @Prop()
  recipient_email: string;

  @Prop()
  recipient_phone: string;

  @Prop({ required: true })
  subject: string;

  @Prop()
  body: string;

  @Prop({ default: 'PENDING' })
  status: string;

  @Prop()
  error_message: string;

  @Prop()
  sent_at: Date;

  @Prop({ index: true })
  created_at: Date;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);
NotificationLogSchema.index({ school_id: 1, type: 1, created_at: -1 });
NotificationLogSchema.index({ event: 1, school_id: 1 });

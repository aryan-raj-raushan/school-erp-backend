import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ collection: 'audit_logs', timestamps: true })
export class AuditLog {
  @Prop({ required: true, index: true })
  school_id: string;

  @Prop({ required: true, index: true })
  user_id: string;

  @Prop({ required: true })
  user_role: string;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true, index: true })
  entity: string;

  @Prop({ index: true })
  entity_id: string;

  @Prop({ type: Object })
  before_state: Record<string, unknown>;

  @Prop({ type: Object })
  after_state: Record<string, unknown>;

  @Prop({ type: Object })
  metadata: {
    ip_address?: string;
    user_agent?: string;
    endpoint?: string;
    http_method?: string;
    request_id?: string;
  };

  @Prop({ index: true })
  created_at: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ school_id: 1, created_at: -1 });
AuditLogSchema.index({ entity: 1, entity_id: 1 });
AuditLogSchema.index({ user_id: 1, created_at: -1 });

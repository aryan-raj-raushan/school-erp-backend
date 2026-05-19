import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DocumentUploadDocument = DocumentUpload & Document;

@Schema({ collection: 'document_uploads', timestamps: true })
export class DocumentUpload {
  @Prop({ required: true, index: true })
  school_id: string;

  @Prop({ required: true, index: true })
  reference_id: string;

  @Prop({ required: true })
  reference_type: string;

  @Prop({ required: true })
  document_type: string;

  @Prop({ required: true })
  original_name: string;

  @Prop({ required: true })
  s3_key: string;

  @Prop({ required: true })
  s3_url: string;

  @Prop()
  mime_type: string;

  @Prop()
  file_size_bytes: number;

  @Prop({ default: false })
  is_deleted: boolean;

  @Prop({ index: true })
  uploaded_by: string;
}

export const DocumentUploadSchema = SchemaFactory.createForClass(DocumentUpload);
DocumentUploadSchema.index({ school_id: 1, reference_id: 1 });
DocumentUploadSchema.index({ s3_key: 1 }, { unique: true });

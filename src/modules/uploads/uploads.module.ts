import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { DocumentUpload, DocumentUploadSchema } from '../../database/mongo/schemas/document-upload.schema';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
    MongooseModule.forFeature([{ name: DocumentUpload.name, schema: DocumentUploadSchema }]),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}

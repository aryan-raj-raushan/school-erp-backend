import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { DocumentUpload, DocumentUploadSchema } from './schemas/document-upload.schema';
import { NotificationLog, NotificationLogSchema } from './schemas/notification-log.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.mongo.uri'),
        dbName: configService.get<string>('database.mongo.dbName'),
      }),
    }),
    MongooseModule.forFeature([
      { name: DocumentUpload.name, schema: DocumentUploadSchema },
      { name: NotificationLog.name, schema: NotificationLogSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class MongoModule {}

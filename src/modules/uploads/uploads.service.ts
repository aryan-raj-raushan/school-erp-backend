import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { DocumentUpload } from '../../database/mongo/schemas/document-upload.schema';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(DocumentUpload.name) private readonly docUploadModel: Model<DocumentUpload>,
  ) {
    this.s3 = new S3Client({
      region: this.configService.get<string>('aws.region'),
      credentials: {
        accessKeyId: this.configService.get<string>('aws.accessKeyId')!,
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey')!,
      },
    });
    this.bucket = this.configService.get<string>('aws.s3Bucket')!;
  }

  async uploadImage(
    file: Express.Multer.File,
    schoolId: string,
    uploadedBy: string,
  ): Promise<{ url: string; s3Key: string }> {
    this.validateFile(file, ALLOWED_IMAGE_TYPES);
    return this.upload(file, schoolId, 'images', uploadedBy);
  }

  async uploadDocument(
    file: Express.Multer.File,
    schoolId: string,
    uploadedBy: string,
  ): Promise<{ url: string; s3Key: string }> {
    this.validateFile(file, ALLOWED_DOC_TYPES);
    return this.upload(file, schoolId, 'documents', uploadedBy);
  }

  async deleteFile(s3Key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: s3Key }));
    await this.docUploadModel.deleteOne({ s3_key: s3Key }).exec();
    this.logger.log(`Deleted S3 object: ${s3Key}`);
  }

  private async upload(
    file: Express.Multer.File,
    schoolId: string,
    folder: string,
    uploadedBy: string,
  ): Promise<{ url: string; s3Key: string }> {
    const ext = file.originalname.split('.').pop() ?? 'bin';
    const s3Key = `${schoolId}/${folder}/${uuidv4()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
      }),
    );

    const region = this.configService.get<string>('aws.region');
    const url = `https://${this.bucket}.s3.${region}.amazonaws.com/${s3Key}`;

    await this.docUploadModel.create({
      school_id: schoolId,
      uploaded_by: uploadedBy,
      original_name: file.originalname,
      mime_type: file.mimetype,
      size_bytes: file.size,
      s3_key: s3Key,
      s3_url: url,
      folder,
    });

    return { url, s3Key };
  }

  private validateFile(file: Express.Multer.File, allowedTypes: string[]): void {
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
    }
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} not allowed`);
    }
  }
}

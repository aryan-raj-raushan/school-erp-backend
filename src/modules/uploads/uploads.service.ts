import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Readable } from 'stream';
import { CompanyRole } from '../../shared/enums';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { DocumentUpload } from '../../database/mongo/schemas/document-upload.schema';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const FILE_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
};

export interface UploadMeta {
  reference_id: string;
  reference_type: string;
  document_type: string;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(DocumentUpload.name) private readonly docUploadModel: Model<DocumentUpload>,
  ) {
    const endpoint = this.configService.get<string>('aws.s3Endpoint');
    this.s3 = new S3Client({
      region: this.configService.get<string>('aws.region'),
      credentials: {
        accessKeyId: this.configService.get<string>('aws.accessKeyId')!,
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey')!,
      },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
    this.bucket = this.configService.get<string>('aws.s3Bucket')!;
  }

  async uploadImage(
    file: Express.Multer.File,
    schoolId: string,
    uploadedBy: string,
    meta: UploadMeta,
  ): Promise<{ url: string; s3Key: string }> {
    this.validateFile(file, ALLOWED_IMAGE_TYPES);
    return this.upload(file, schoolId, 'images', uploadedBy, meta);
  }

  async uploadDocument(
    file: Express.Multer.File,
    schoolId: string,
    uploadedBy: string,
    meta: UploadMeta,
  ): Promise<{ url: string; s3Key: string }> {
    this.validateFile(file, ALLOWED_DOC_TYPES);
    return this.upload(file, schoolId, 'documents', uploadedBy, meta);
  }

  private static readonly S3_KEY_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(images|documents)\/.+$/i;

  static keyFromUrl(url: string): string | null {
    const match = url.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(images|documents)\/[^?#]+/i,
    );
    return match ? match[0] : null;
  }

  private assertKeyAccess(s3Key: string, callerSchoolId?: string, callerRole?: string) {
    if (!UploadsService.S3_KEY_PATTERN.test(s3Key)) {
      throw new BadRequestException('Invalid S3 key format');
    }
    const keySchoolId = s3Key.split('/')[0];
    if (callerRole === CompanyRole.SUPER_ADMIN) return;
    if (!callerSchoolId || keySchoolId !== callerSchoolId) {
      throw new ForbiddenException('Cannot access files from another school');
    }
  }

  async getFile(
    s3Key: string,
    callerSchoolId?: string,
    callerRole?: string,
  ): Promise<{ body: Readable; contentType: string; contentLength?: number }> {
    this.assertKeyAccess(s3Key ?? '', callerSchoolId, callerRole);
    try {
      const object = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: s3Key }));
      return {
        body: object.Body as Readable,
        contentType: object.ContentType ?? 'application/octet-stream',
        contentLength: object.ContentLength,
      };
    } catch (error) {
      if ((error as { name?: string }).name === 'NoSuchKey') {
        throw new NotFoundException('File not found');
      }
      throw error;
    }
  }

  async deleteByUrls(urls: string[], schoolId: string): Promise<void> {
    const keys = urls
      .map((url) => UploadsService.keyFromUrl(url))
      .filter((key): key is string => !!key && key.startsWith(`${schoolId}/`));
    await Promise.all(
      keys.map((key) =>
        this.deleteFile(key, schoolId).catch((error: Error) =>
          this.logger.warn(`Could not delete S3 object ${key}: ${error.message}`),
        ),
      ),
    );
  }

  async deleteFile(s3Key: string, callerSchoolId?: string, callerRole?: string): Promise<void> {
    this.assertKeyAccess(s3Key, callerSchoolId, callerRole);
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: s3Key }));
    await this.docUploadModel.deleteOne({ s3_key: s3Key }).exec();
    this.logger.log(`Deleted S3 object: ${s3Key}`);
  }

  private async upload(
    file: Express.Multer.File,
    schoolId: string,
    folder: string,
    uploadedBy: string,
    meta: UploadMeta,
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

    const baseUrl = this.configService.get<string>('aws.s3BaseUrl');
    const region = this.configService.get<string>('aws.region');
    const url = baseUrl
      ? `${baseUrl.replace(/\/$/, '')}/${s3Key}`
      : `https://${this.bucket}.s3.${region}.amazonaws.com/${s3Key}`;

    await this.docUploadModel.create({
      school_id: schoolId,
      uploaded_by: uploadedBy,
      original_name: file.originalname,
      mime_type: file.mimetype,
      file_size_bytes: file.size,
      s3_key: s3Key,
      s3_url: url,
      reference_id: meta.reference_id,
      reference_type: meta.reference_type,
      document_type: meta.document_type,
    });

    return { url, s3Key };
  }

  private validateFile(file: Express.Multer.File, allowedTypes: string[]): void {
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File is too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.`,
      );
    }
    if (!allowedTypes.includes(file.mimetype)) {
      const allowed = allowedTypes.map((t) => FILE_TYPE_LABELS[t] ?? t);
      throw new BadRequestException(
        `Unsupported file type. Please upload ${[...new Set(allowed)].join(', ')} only.`,
      );
    }
  }
}

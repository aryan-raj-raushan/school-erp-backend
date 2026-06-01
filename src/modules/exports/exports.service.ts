import { Injectable, NotFoundException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface ExportJob {
  jobId: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  fileUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

@Injectable()
export class ExportsService {
  constructor(private readonly redisService: RedisService) {}

  async getJobStatus(jobId: string): Promise<ExportJob> {
    const keys = [
      `export_job:attendance:${jobId}`,
      `export_job:marksheet:${jobId}`,
      `bulk_job:staff:${jobId}`,
      `bulk_job:parent:${jobId}`,
    ];

    for (const key of keys) {
      const raw = await this.redisService.get(key);
      if (raw) {
        const job = JSON.parse(raw);
        return {
          jobId: job.jobId ?? jobId,
          status: job.status ?? 'PENDING',
          fileUrl: job.fileUrl,
          error: job.error,
          createdAt: job.createdAt ?? new Date().toISOString(),
          completedAt: job.completedAt,
        };
      }
    }

    throw new NotFoundException(`Export job '${jobId}' not found or expired`);
  }

  async getDownloadUrl(jobId: string): Promise<{ url: string }> {
    const job = await this.getJobStatus(jobId);
    if (job.status !== 'DONE') {
      throw new NotFoundException(`Export job '${jobId}' is not ready yet (status: ${job.status})`);
    }
    if (!job.fileUrl) {
      throw new NotFoundException(`No file available for job '${jobId}'`);
    }
    return { url: job.fileUrl };
  }
}

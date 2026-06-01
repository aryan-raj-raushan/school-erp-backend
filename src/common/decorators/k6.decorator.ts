import { ApiExtension } from '@nestjs/swagger';

export interface K6Meta {
  /** Exclude this endpoint from k6 entirely */
  skip?: boolean;
  /** Force which token to use — auto-detected from tag if omitted */
  authContext?: 'school' | 'company' | 'none';
  /** Only include in smoke scenario, not full load — auto-set for DELETE if omitted */
  smokeOnly?: boolean;
  /** 404 is an acceptable response — auto-detected from Swagger responses if omitted */
  allow404?: boolean;
  /**
   * Override auto-resolved param → source list path mapping.
   * Only needed when auto-resolution fails (e.g. param name doesn't match path structure).
   * e.g. { schoolId: '/api/v1/schools' }
   */
  paramSources?: Record<string, string>;
}

/**
 * Optional k6 load-test metadata. Omit entirely for fully automatic behavior.
 * Only needed to override auto-detection (e.g. force authContext, mark skip).
 */
export const K6 = (meta: K6Meta) => ApiExtension('x-k6', meta);

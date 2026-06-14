import { Module } from '@nestjs/common';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { TransferCertificateRepository } from './transfer-certificate.repository';
import { BonafideCertificateRepository } from './bonafide-certificate.repository';

// Cross-module repos injected here — ensure their modules export them,
// or declare them directly if they live in the same bounded context.
import { StudentsRepository } from '../students/students.repository';
import { SchoolsRepository } from '../schools/schools.repository';

@Module({
  controllers: [CertificatesController],
  providers: [
    // ── Service ───────────────────────────────────────────────────────────
    CertificatesService,

    // ── Certificate-scoped repositories ───────────────────────────────────
    TransferCertificateRepository,
    BonafideCertificateRepository,

    // ── Cross-module repositories (student / school lookups) ──────────────
    // If these are already exported from their own modules and imported via
    // forwardRef / module imports, remove them from providers here and add
    // the modules to the `imports` array instead.
    StudentsRepository,
    SchoolsRepository,
  ],
  exports: [CertificatesService],
})
export class CertificatesModule {}
import { Module } from '@nestjs/common';
import { StudentsModule } from '../students/students.module';
import { StaffModule } from '../staff/staff.module';
import { FinanceModule } from '../finance/finance.module';
import { BULK_IMPORT_CONTROLLERS } from './bulk-import.controller';
import { BulkImportService } from './bulk-import.service';
import { BulkImportRepository } from './bulk-import.repository';
import { BulkImportLookups } from './bulk-import.lookups';
import { StudentsImporter } from './importers/students.importer';
import { StaffImporter } from './importers/staff.importer';
import { FinanceAccountsImporter } from './importers/finance-accounts.importer';
import { FinanceHeadsImporter } from './importers/finance-heads.importer';
import { FinanceIncomeImporter } from './importers/finance-income.importer';
import { FinanceExpensesImporter } from './importers/finance-expenses.importer';

@Module({
  imports: [StudentsModule, StaffModule, FinanceModule],
  controllers: BULK_IMPORT_CONTROLLERS,
  providers: [
    BulkImportService,
    BulkImportRepository,
    BulkImportLookups,
    StudentsImporter,
    StaffImporter,
    FinanceAccountsImporter,
    FinanceHeadsImporter,
    FinanceIncomeImporter,
    FinanceExpensesImporter,
  ],
})
export class BulkImportModule {}

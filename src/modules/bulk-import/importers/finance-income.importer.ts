import { Injectable } from '@nestjs/common';
import { FinanceService } from '../../finance/finance.service';
import { CreateFinanceIncomeDto } from '../../finance/dto/create-finance-income.dto';
import { BulkImportRepository } from '../bulk-import.repository';
import { BulkImportLookups } from '../bulk-import.lookups';
import { lower } from '../bulk-import.utils';
import { PendingRecords } from '../bulk-import.types';
import {
  LedgerEntry,
  LedgerEntryImporter,
  PENDING_ID_PREFIX,
  Party,
} from './ledger-entry.importer';

@Injectable()
export class FinanceIncomeImporter extends LedgerEntryImporter<CreateFinanceIncomeDto> {
  readonly entity = 'finance-income' as const;
  readonly label = 'Income Entries';
  readonly dto = CreateFinanceIncomeDto;
  readonly fieldColumns: Record<string, string> = {
    income_head_id: 'head',
    to_account_id: 'account',
    amount: 'amount',
    date_of_income: 'date',
    remarks: 'remarks',
  };
  protected readonly config = {
    headType: 'Income' as const,
    accountHeader: 'Credit To Account',
    partyHeader: 'Student Admission Number',
    partyHint: 'Optional — links the income to a student',
  };

  constructor(
    repo: BulkImportRepository,
    lookups: BulkImportLookups,
    private readonly financeService: FinanceService,
  ) {
    super(repo, lookups);
  }

  protected toEntry(p: CreateFinanceIncomeDto): LedgerEntry {
    return {
      head_id: p.income_head_id,
      account_id: p.to_account_id,
      amount: Number(p.amount),
      date: p.date_of_income,
      remarks: p.remarks,
    };
  }

  protected fromEntry(e: LedgerEntry): CreateFinanceIncomeDto {
    return {
      income_head_id: e.head_id,
      to_account_id: e.account_id,
      amount: e.amount,
      date_of_income: e.date,
      remarks: e.remarks,
    } as CreateFinanceIncomeDto;
  }

  protected assignParty(p: CreateFinanceIncomeDto, partyId: string): void {
    p.student_id = partyId;
  }

  protected partyId(p: CreateFinanceIncomeDto): string | undefined {
    return p.student_id;
  }

  protected pendingParties(pending: PendingRecords): Map<string, Party> {
    return new Map(
      pending.students.map((s) => [
        lower(s.admission_number),
        { id: `${PENDING_ID_PREFIX}student:${lower(s.admission_number)}`, name: s.name },
      ]),
    );
  }

  protected async resolveParties(schoolId: string, refs: string[]): Promise<Map<string, Party>> {
    const rows = await this.repo.findStudentsByAcademicNumber(schoolId, 'admission_number', refs);
    return new Map(rows.map((r) => [lower(r.value), { id: r.student_id, name: r.name }]));
  }

  protected findExisting(schoolId: string, dates: string[]) {
    return this.repo.findIncomeOnDates(schoolId, dates);
  }

  protected save(p: CreateFinanceIncomeDto, schoolId: string, userId: string) {
    return this.financeService.createIncome(p, schoolId, userId);
  }
}

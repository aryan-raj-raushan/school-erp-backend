import { Injectable } from '@nestjs/common';
import { FinanceService } from '../../finance/finance.service';
import { CreateFinanceExpenseDto } from '../../finance/dto/create-finance-expense.dto';
import { BulkImportRepository } from '../bulk-import.repository';
import { BulkImportLookups } from '../bulk-import.lookups';
import { lower } from '../bulk-import.utils';
import { parsePhone } from '../excel/cell-parsers';
import { PendingRecords } from '../bulk-import.types';
import {
  LedgerEntry,
  LedgerEntryImporter,
  PENDING_ID_PREFIX,
  Party,
} from './ledger-entry.importer';

@Injectable()
export class FinanceExpensesImporter extends LedgerEntryImporter<CreateFinanceExpenseDto> {
  readonly entity = 'finance-expenses' as const;
  readonly label = 'Expense Entries';
  readonly dto = CreateFinanceExpenseDto;
  readonly fieldColumns: Record<string, string> = {
    expense_head_id: 'head',
    from_account_id: 'account',
    total_amount: 'amount',
    date_of_expense: 'date',
    remarks: 'remarks',
  };
  protected readonly config = {
    headType: 'Expense' as const,
    accountHeader: 'Paid From Account',
    partyHeader: 'Employee Code or Mobile',
    partyHint: 'Optional — links the expense to a staff member',
  };

  constructor(
    repo: BulkImportRepository,
    lookups: BulkImportLookups,
    private readonly financeService: FinanceService,
  ) {
    super(repo, lookups);
  }

  protected toEntry(p: CreateFinanceExpenseDto): LedgerEntry {
    return {
      head_id: p.expense_head_id,
      account_id: p.from_account_id,
      amount: Number(p.total_amount),
      date: p.date_of_expense,
      remarks: p.remarks,
    };
  }

  protected fromEntry(e: LedgerEntry): CreateFinanceExpenseDto {
    return {
      expense_head_id: e.head_id,
      from_account_id: e.account_id,
      total_amount: e.amount,
      date_of_expense: e.date,
      remarks: e.remarks,
    } as CreateFinanceExpenseDto;
  }

  protected assignParty(p: CreateFinanceExpenseDto, partyId: string): void {
    p.employee_id = partyId;
  }

  protected partyId(p: CreateFinanceExpenseDto): string | undefined {
    return p.employee_id;
  }

  protected pendingParties(pending: PendingRecords): Map<string, Party> {
    const parties = new Map<string, Party>();
    pending.staff.forEach((s) => {
      const party = { id: `${PENDING_ID_PREFIX}staff:${s.phone_number}`, name: s.name };
      parties.set(lower(s.phone_number), party);
      if (s.employee_code) parties.set(lower(s.employee_code), party);
    });
    return parties;
  }

  protected async resolveParties(schoolId: string, refs: string[]): Promise<Map<string, Party>> {
    const phones = new Map(
      refs.map((ref) => [parsePhone(ref), lower(ref)] as const).filter(([phone]) => !!phone),
    );
    const [byPhone, byCode] = await Promise.all([
      this.repo.findStaffByPhones([...phones.keys()] as string[]),
      this.repo.findStaffByField(schoolId, 'employee_code', refs.map(lower)),
    ]);
    const parties = new Map<string, Party>();
    byCode.forEach((s) => parties.set(lower(s.value), { id: s.id, name: s.name }));
    byPhone
      .filter((s) => s.school_id === schoolId)
      .forEach((s) => parties.set(phones.get(s.phone_number)!, { id: s.id, name: s.name }));
    return parties;
  }

  protected findExisting(schoolId: string, dates: string[]) {
    return this.repo.findExpensesOnDates(schoolId, dates);
  }

  protected save(p: CreateFinanceExpenseDto, schoolId: string, userId: string) {
    return this.financeService.createExpense(p, schoolId, userId);
  }
}

import { Injectable } from '@nestjs/common';
import { FinanceService } from '../../finance/finance.service';
import { CreateFinanceAccountDto } from '../../finance/dto/create-finance-account.dto';
import { FINANCE_ACCOUNT_TYPES } from '../../../database/drizzle/schema/finance-accounts.schema';
import { BulkImportLookups } from '../bulk-import.lookups';
import {
  BulkImporter,
  ImportColumn,
  PersistResult,
  RowContext,
  RowValues,
  UniqueKey,
  ValidatedRow,
} from '../bulk-import.types';
import { YES_NO, flag, lower, todayIst } from '../bulk-import.utils';

type Account = Awaited<ReturnType<BulkImportLookups['financeAccounts']>>[number];

interface AccountsContext {
  accounts: Account[];
  today: string;
}

const TYPE_ALIASES: Record<string, string[]> = {
  Bank: ['Bank Account', 'Current', 'Savings'],
  Cash: ['Cash In Hand', 'Petty Cash'],
  'E-Wallet': ['EWallet', 'Wallet', 'UPI', 'Paytm', 'PhonePe', 'GPay'],
};

@Injectable()
export class FinanceAccountsImporter implements BulkImporter<
  AccountsContext,
  CreateFinanceAccountDto
> {
  readonly entity = 'finance-accounts' as const;
  readonly label = 'Finance Accounts';
  readonly dto = CreateFinanceAccountDto;
  readonly fieldColumns: Record<string, string> = {
    name: 'name',
    account_type: 'account_type',
    opening_balance: 'opening_balance',
    account_start_date: 'account_start_date',
  };
  readonly uniqueKeys: UniqueKey<CreateFinanceAccountDto>[] = [
    { label: 'account name', column: 'name', severity: 'error', key: (p) => p.name },
  ];

  constructor(
    private readonly lookups: BulkImportLookups,
    private readonly financeService: FinanceService,
  ) {}

  async loadContext(schoolId: string): Promise<AccountsContext> {
    return { accounts: await this.lookups.financeAccounts(schoolId), today: todayIst() };
  }

  columns(): ImportColumn[] {
    return [
      {
        key: 'name',
        header: 'Account Name',
        kind: 'text',
        required: true,
        maxLength: 255,
        hint: 'e.g. SBI Current A/c. Must be unique.',
        width: 28,
      },
      {
        key: 'account_type',
        header: 'Account Type',
        kind: 'enum',
        required: true,
        options: FINANCE_ACCOUNT_TYPES.map((t) => ({
          value: t,
          label: t,
          aliases: TYPE_ALIASES[t],
        })),
        hint: 'Bank, Cash or E-Wallet',
      },
      {
        key: 'opening_balance',
        header: 'Opening Balance',
        kind: 'amount',
        hint: 'Defaults to 0. Cannot be changed later.',
      },
      {
        key: 'account_start_date',
        header: 'Account Start Date',
        kind: 'date',
        required: true,
        hint: 'Entries before this date are not allowed',
      },
      {
        key: 'is_enabled',
        header: 'Enabled',
        kind: 'boolean',
        options: YES_NO,
        hint: 'Defaults to Yes',
      },
    ];
  }

  examples(ctx: AccountsContext): RowValues[] {
    return [
      {
        name: 'SBI Current Account',
        account_type: 'Bank',
        opening_balance: '250000',
        account_start_date: ctx.today,
        is_enabled: 'Yes',
      },
      {
        name: 'Office Cash',
        account_type: 'Cash',
        opening_balance: '15000',
        account_start_date: ctx.today,
      },
      { name: 'School UPI Wallet', account_type: 'E-Wallet', account_start_date: ctx.today },
    ];
  }

  notes(): string[] {
    return [
      'Opening balance is fixed once the account is created — double-check it before importing.',
    ];
  }

  toPayload(row: RowContext, ctx: AccountsContext): CreateFinanceAccountDto | undefined {
    const v = row.values;
    if (v.account_start_date && String(v.account_start_date) > ctx.today) {
      row.issue('account_start_date', 'Account start date is in the future', 'warning');
    }
    return {
      name: String(v.name ?? ''),
      account_type: String(v.account_type ?? ''),
      opening_balance: (v.opening_balance as number | undefined) ?? 0,
      account_start_date: String(v.account_start_date ?? ''),
      is_enabled: (v.is_enabled as boolean | undefined) ?? true,
    } as CreateFinanceAccountDto;
  }

  async checkExisting(rows: ValidatedRow<CreateFinanceAccountDto>[], ctx: AccountsContext) {
    const existing = new Set(ctx.accounts.map((a) => lower(a.name)));
    rows.forEach((row) => {
      if (existing.has(lower(row.payload!.name))) {
        flag(row, 'name', `An account named '${row.payload!.name}' already exists`);
      }
    });
  }

  async persist(
    payload: CreateFinanceAccountDto,
    schoolId: string,
    userId: string,
  ): Promise<PersistResult> {
    const account = await this.financeService.createAccount(payload, schoolId, userId);
    return { id: account.id, label: `${account.name} (${account.account_type})` };
  }
}

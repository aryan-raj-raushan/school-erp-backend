import { ClassConstructor } from 'class-transformer';
import { BulkImportRepository } from '../bulk-import.repository';
import { BulkImportLookups } from '../bulk-import.lookups';
import {
  BulkEntity,
  BulkImporter,
  ImportColumn,
  PersistResult,
  RowContext,
  RowValues,
  UniqueKey,
  ValidatedRow,
} from '../bulk-import.types';
import { flag, lower, todayIst } from '../bulk-import.utils';

type Account = Awaited<ReturnType<BulkImportLookups['financeAccounts']>>[number];
type Head = Awaited<ReturnType<BulkImportLookups['financeHeads']>>[number];

export interface LedgerContext {
  accounts: Account[];
  heads: Head[];
  today: string;
}

export interface LedgerEntry {
  head_id: string;
  account_id: string;
  amount: number;
  date: string;
  remarks?: string;
}

export interface ExistingEntry {
  head_id: string;
  account_id: string;
  amount: string;
  date: string;
  party_id: string | null;
}

export interface Party {
  id: string;
  name: string;
}

export interface LedgerConfig {
  headType: 'Income' | 'Expense';
  accountHeader: string;
  partyHeader: string;
  partyHint: string;
}

function str(value: unknown): string | undefined {
  return value === undefined || value === null || value === '' ? undefined : String(value);
}

/**
 * Shared rules for income and expense rows. In-file duplicates are detected here rather than via
 * uniqueKeys because the party (student / employee) is only resolved to an id in checkExisting.
 */
export abstract class LedgerEntryImporter<TPayload extends object> implements BulkImporter<
  LedgerContext,
  TPayload
> {
  abstract readonly entity: BulkEntity;
  abstract readonly label: string;
  abstract readonly dto: ClassConstructor<TPayload>;
  abstract readonly fieldColumns: Record<string, string>;
  protected abstract readonly config: LedgerConfig;

  readonly uniqueKeys: UniqueKey<TPayload>[] = [];

  protected constructor(
    protected readonly repo: BulkImportRepository,
    protected readonly lookups: BulkImportLookups,
  ) {}

  protected abstract toEntry(payload: TPayload): LedgerEntry;
  protected abstract fromEntry(entry: LedgerEntry): TPayload;
  protected abstract assignParty(payload: TPayload, partyId: string): void;
  protected abstract resolveParties(schoolId: string, refs: string[]): Promise<Map<string, Party>>;
  protected abstract findExisting(schoolId: string, dates: string[]): Promise<ExistingEntry[]>;
  protected abstract partyId(payload: TPayload): string | undefined;
  protected abstract save(
    payload: TPayload,
    schoolId: string,
    userId: string,
  ): Promise<{ id: string }>;

  async loadContext(schoolId: string): Promise<LedgerContext> {
    const [accounts, heads] = await Promise.all([
      this.lookups.financeAccounts(schoolId),
      this.lookups.financeHeads(schoolId),
    ]);
    return { accounts, heads, today: todayIst() };
  }

  private usableHeads(ctx: LedgerContext): Head[] {
    return ctx.heads.filter((h) => h.head_type === this.config.headType && h.is_enabled);
  }

  columns(ctx: LedgerContext): ImportColumn[] {
    const type = this.config.headType.toLowerCase();
    return [
      {
        key: 'date',
        header: 'Date',
        kind: 'date',
        required: true,
        hint: 'Cannot be in the future or before the account start date',
      },
      {
        key: 'head',
        header: `${this.config.headType} Head`,
        kind: 'enum',
        required: true,
        options: this.usableHeads(ctx).map((h) => ({ value: h.id, label: h.name })),
        hint: `Enabled ${type} heads from Finance → Setup`,
        width: 26,
      },
      {
        key: 'account',
        header: this.config.accountHeader,
        kind: 'enum',
        required: true,
        options: ctx.accounts
          .filter((a) => a.is_enabled)
          .map((a) => ({ value: a.id, label: a.name })),
        hint: 'Enabled accounts from Finance → Setup',
        width: 26,
      },
      {
        key: 'amount',
        header: 'Amount',
        kind: 'amount',
        required: true,
        hint: 'Greater than 0, up to 2 decimals',
      },
      {
        key: 'party',
        header: this.config.partyHeader,
        kind: 'text',
        maxLength: 50,
        hint: this.config.partyHint,
        width: 24,
      },
      {
        key: 'remarks',
        header: 'Remarks',
        kind: 'text',
        maxLength: 500,
        hint: 'Optional note',
        width: 36,
      },
    ];
  }

  examples(ctx: LedgerContext): RowValues[] {
    const heads = this.usableHeads(ctx);
    const accounts = ctx.accounts.filter((a) => a.is_enabled);
    const head = (i: number) => heads[i % Math.max(heads.length, 1)]?.name ?? '';
    const account = (i: number) => accounts[i % Math.max(accounts.length, 1)]?.name ?? '';
    return [
      {
        date: ctx.today,
        head: head(0),
        account: account(0),
        amount: '1500',
        remarks: 'Sample entry',
      },
      {
        date: ctx.today,
        head: head(1),
        account: account(1),
        amount: '2750.50',
        remarks: 'Paid by cheque',
      },
    ];
  }

  notes(ctx: LedgerContext): string[] {
    const notes = [
      'Every row updates the account balance immediately, exactly like adding the entry by hand.',
    ];
    if (!this.usableHeads(ctx).length) {
      notes.push(
        `No enabled ${this.config.headType.toLowerCase()} heads exist yet — add them in Finance → Setup first.`,
      );
    }
    if (!ctx.accounts.some((a) => a.is_enabled)) {
      notes.push('No enabled accounts exist yet — add them in Finance → Setup first.');
    }
    return notes;
  }

  toPayload(row: RowContext, ctx: LedgerContext): TPayload | undefined {
    const v = row.values;
    const account = ctx.accounts.find((a) => a.id === v.account);
    const date = str(v.date);

    if (v.amount !== undefined && Number(v.amount) <= 0) {
      row.issue('amount', 'Amount must be greater than 0');
    }
    if (date && date > ctx.today) row.issue('date', 'Date cannot be in the future');
    if (date && account && date < account.account_start_date) {
      row.issue('date', `Account '${account.name}' starts on ${account.account_start_date}`);
    }
    if (!account || !v.head || !date || v.amount === undefined) return undefined;

    return this.fromEntry({
      head_id: String(v.head),
      account_id: account.id,
      amount: Number(v.amount),
      date,
      remarks: str(v.remarks),
    });
  }

  async checkExisting(
    rows: ValidatedRow<TPayload>[],
    ctx: LedgerContext,
    schoolId: string,
  ): Promise<void> {
    const entries = rows.map((r) => this.toEntry(r.payload!));
    const refOf = (row: ValidatedRow<TPayload>) => str(row.parsed.party);
    const refs = [...new Set(rows.map(refOf).filter((x): x is string => !!x))];
    const dates = [...new Set(entries.map((e) => e.date))];
    const [parties, existing] = await Promise.all([
      this.resolveParties(schoolId, refs),
      this.findExisting(schoolId, dates),
    ]);

    const existingKeys = new Set(
      existing.map((e) =>
        [e.date, e.head_id, e.account_id, Number(e.amount).toFixed(2), e.party_id ?? ''].join('|'),
      ),
    );
    const balances = new Map(ctx.accounts.map((a) => [a.id, Number(a.current_balance)]));
    const seenInFile = new Map<string, number>();

    rows.forEach((row, i) => {
      const entry = entries[i];
      const ref = refOf(row);
      if (ref) {
        const party = parties.get(lower(ref));
        if (!party) {
          flag(row, 'party', `No ${this.config.partyHeader.toLowerCase()} '${ref}' found`);
          return;
        }
        this.assignParty(row.payload!, party.id);
      }

      const key = [
        entry.date,
        entry.head_id,
        entry.account_id,
        entry.amount.toFixed(2),
        this.partyId(row.payload!) ?? '',
      ].join('|');
      if (existingKeys.has(key)) {
        flag(
          row,
          'amount',
          'An identical entry already exists on this date — possible duplicate',
          'warning',
        );
      }
      const firstRow = seenInFile.get(key);
      if (firstRow === undefined) seenInFile.set(key, row.row);
      else
        flag(
          row,
          'amount',
          `Same entry as row ${firstRow} in this file — possible duplicate`,
          'warning',
        );

      if (this.config.headType === 'Expense') {
        const balance = (balances.get(entry.account_id) ?? 0) - entry.amount;
        balances.set(entry.account_id, balance);
        if (balance < 0) {
          flag(
            row,
            'account',
            `Account balance will go negative (₹${balance.toFixed(2)})`,
            'warning',
          );
        }
      }
    });
  }

  async persist(payload: TPayload, schoolId: string, userId: string): Promise<PersistResult> {
    const entry = this.toEntry(payload);
    const saved = await this.save(payload, schoolId, userId);
    return {
      id: saved.id,
      label: `${entry.date} · ₹${entry.amount.toFixed(2)}${entry.remarks ? ` · ${entry.remarks}` : ''}`,
    };
  }
}

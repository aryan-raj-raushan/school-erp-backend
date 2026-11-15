import { Injectable } from '@nestjs/common';
import { FinanceService } from '../../finance/finance.service';
import { CreateFinanceHeadDto } from '../../finance/dto/create-finance-head.dto';
import { FINANCE_HEAD_TYPES } from '../../../database/drizzle/schema/finance-heads.schema';
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
import { YES_NO, flag, lower } from '../bulk-import.utils';

type Head = Awaited<ReturnType<BulkImportLookups['financeHeads']>>[number];

interface HeadsContext {
  heads: Head[];
}

@Injectable()
export class FinanceHeadsImporter implements BulkImporter<HeadsContext, CreateFinanceHeadDto> {
  readonly entity = 'finance-heads' as const;
  readonly label = 'Income & Expense Heads';
  readonly dto = CreateFinanceHeadDto;
  readonly fieldColumns: Record<string, string> = { name: 'name', head_type: 'head_type' };
  readonly uniqueKeys: UniqueKey<CreateFinanceHeadDto>[] = [
    {
      label: 'head (same name and type)',
      column: 'name',
      severity: 'error',
      key: (p) => `${p.head_type}|${p.name}`,
    },
  ];

  constructor(
    private readonly lookups: BulkImportLookups,
    private readonly financeService: FinanceService,
  ) {}

  async loadContext(schoolId: string): Promise<HeadsContext> {
    return { heads: await this.lookups.financeHeads(schoolId) };
  }

  columns(): ImportColumn[] {
    return [
      {
        key: 'name',
        header: 'Head Name',
        kind: 'text',
        required: true,
        maxLength: 255,
        hint: 'e.g. Admission Fee, Electricity Bill',
        width: 28,
      },
      {
        key: 'head_type',
        header: 'Head Type',
        kind: 'enum',
        required: true,
        options: FINANCE_HEAD_TYPES.map((t) => ({
          value: t,
          label: t,
          aliases: t === 'Income' ? ['Credit', 'Receipt'] : ['Debit', 'Payment'],
        })),
        hint: 'Income or Expense',
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

  examples(): RowValues[] {
    return [
      { name: 'Admission Fee', head_type: 'Income', is_enabled: 'Yes' },
      { name: 'Donation', head_type: 'Income' },
      { name: 'Electricity Bill', head_type: 'Expense' },
      { name: 'Stationery', head_type: 'Expense' },
    ];
  }

  notes(): string[] {
    return ['The same name can exist once as an Income head and once as an Expense head.'];
  }

  toPayload(row: RowContext): CreateFinanceHeadDto | undefined {
    const v = row.values;
    return {
      name: String(v.name ?? ''),
      head_type: String(v.head_type ?? ''),
      is_enabled: (v.is_enabled as boolean | undefined) ?? true,
    } as CreateFinanceHeadDto;
  }

  async checkExisting(rows: ValidatedRow<CreateFinanceHeadDto>[], ctx: HeadsContext) {
    const existing = new Set(ctx.heads.map((h) => `${h.head_type}|${lower(h.name)}`));
    rows.forEach((row) => {
      const p = row.payload!;
      if (existing.has(`${p.head_type}|${lower(p.name)}`)) {
        flag(row, 'name', `${p.head_type} head '${p.name}' already exists`);
      }
    });
  }

  async persist(
    payload: CreateFinanceHeadDto,
    schoolId: string,
    userId: string,
  ): Promise<PersistResult> {
    const head = await this.financeService.createHead(payload, schoolId, userId);
    return { id: head.id, label: `${head.name} (${head.head_type})` };
  }
}

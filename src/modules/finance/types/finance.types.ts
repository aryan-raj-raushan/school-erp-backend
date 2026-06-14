import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { financeAccounts } from '../../../database/drizzle/schema/finance-accounts.schema';
import { financeHeads } from '../../../database/drizzle/schema/finance-heads.schema';
import { financeExpenses } from '../../../database/drizzle/schema/finance-expenses.schema';
import { financeIncome } from '../../../database/drizzle/schema/finance-income.schema';
import { financeTransfers } from '../../../database/drizzle/schema/finance-transfers.schema';

export type FinanceAccount = InferSelectModel<typeof financeAccounts>;
export type NewFinanceAccount = InferInsertModel<typeof financeAccounts>;

export type FinanceHead = InferSelectModel<typeof financeHeads>;
export type NewFinanceHead = InferInsertModel<typeof financeHeads>;

export type FinanceExpense = InferSelectModel<typeof financeExpenses>;
export type NewFinanceExpense = InferInsertModel<typeof financeExpenses>;

export type FinanceIncomeRecord = InferSelectModel<typeof financeIncome>;
export type NewFinanceIncomeRecord = InferInsertModel<typeof financeIncome>;

export type FinanceTransfer = InferSelectModel<typeof financeTransfers>;
export type NewFinanceTransfer = InferInsertModel<typeof financeTransfers>;

export interface FinanceExpenseWithRelations extends FinanceExpense {
  expense_head_name?: string | null;
  from_account_name?: string | null;
}

export interface FinanceIncomeWithRelations extends FinanceIncomeRecord {
  income_head_name?: string | null;
  to_account_name?: string | null;
}

export interface FinanceTransferWithRelations extends FinanceTransfer {
  from_account_name?: string | null;
  to_account_name?: string | null;
}

export interface StatementEntry {
  txn_date: string;
  value_date: string;
  description: string;
  debit: string | null;
  credit: string | null;
  balance: string;
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
}

export interface AccountStatement {
  account: FinanceAccount;
  opening_balance: string;
  closing_balance: string;
  current_balance: string;
  entries: StatementEntry[];
}

export interface RegisterEntry {
  id: string;
  created_at: string;
  transaction_date: string;
  head_name: string;
  head_type: string;
  account_name: string;
  amount: string;
  payee_id?: string | null;
  remarks?: string | null;
  type: 'income' | 'expense';
}

export interface ProfitLossSummary {
  total_income: string;
  total_expense: string;
  net_profit: string;
  income_heads: { head_name: string; amount: string }[];
  expense_heads: { head_name: string; amount: string }[];
}

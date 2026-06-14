import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { salaryHeads } from '../../../database/drizzle/schema/salary-heads.schema';
import { salaryStructureTemplates } from '../../../database/drizzle/schema/salary-structure-templates.schema';
import { salaryStructureItems } from '../../../database/drizzle/schema/salary-structure-items.schema';
import { employeeSalaryAssignments } from '../../../database/drizzle/schema/employee-salary-assignments.schema';
import { salaryTransactions } from '../../../database/drizzle/schema/salary-transactions.schema';

export type SalaryHead = InferSelectModel<typeof salaryHeads>;
export type NewSalaryHead = InferInsertModel<typeof salaryHeads>;

export type SalaryStructureTemplate = InferSelectModel<typeof salaryStructureTemplates>;
export type NewSalaryStructureTemplate = InferInsertModel<typeof salaryStructureTemplates>;

export type SalaryStructureItem = InferSelectModel<typeof salaryStructureItems>;
export type NewSalaryStructureItem = InferInsertModel<typeof salaryStructureItems>;

export type EmployeeSalaryAssignment = InferSelectModel<typeof employeeSalaryAssignments>;
export type NewEmployeeSalaryAssignment = InferInsertModel<typeof employeeSalaryAssignments>;

export type SalaryTransaction = InferSelectModel<typeof salaryTransactions>;
export type NewSalaryTransaction = InferInsertModel<typeof salaryTransactions>;

export interface SalaryStructureItemWithHead extends SalaryStructureItem {
  head_name: string;
  head_type: string;
  head_code: string;
}

export interface SalaryTemplateWithItems extends SalaryStructureTemplate {
  items: SalaryStructureItemWithHead[];
}

export interface SalaryAssignmentWithRelations extends EmployeeSalaryAssignment {
  template_name: string;
  items: SalaryStructureItemWithHead[];
}

export interface SalaryTransactionWithRelations extends SalaryTransaction {
  from_account_name?: string | null;
  expense_head_name?: string | null;
}

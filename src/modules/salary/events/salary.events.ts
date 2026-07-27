export interface SalaryTransactionProcessedEvent {
  transactionId: string;
  schoolId: string;
  employeeId: string;
  fromAccountId: string;
  expenseHeadId: string;
  netAmount: string;
  dateOfExpense: string;
  remarks?: string;
  createdBy?: string;
}

export interface SalaryTransactionVoidedEvent {
  transactionId: string;
  schoolId: string;
  financeExpenseId: string;
}

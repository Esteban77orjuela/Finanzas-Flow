export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export type Frequency = 'MONTHLY';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon?: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'CARD';
  balance: number; // Calculated field in runtime, or initial balance
}

export interface RecurrenceRule {
  id: string;
  frequency: Frequency;
  startDate: string; // ISO Date YYYY-MM-DD
  endDate?: string; // If set, the rule stops generating after this date
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  note: string;
  baseDateDay: number; // The day of month (1-31) to anchor generation
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  date: string; // ISO date string YYYY-MM-DD
  categoryId: string;
  accountId: string;
  note?: string;
  isRecurring: boolean;
  recurrenceRuleId?: string; // Links this specific transaction to a rule
}

export type ViewState = 'DASHBOARD' | 'TRANSACTIONS' | 'PLANNING' | 'SETTINGS' | 'GOALS' | 'DEBTS';

export interface DateFilter {
  month: number; // 0-11
  year: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // "YYYY-MM"
  color: string;
  icon?: string;
  createdAt: string;
}

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  paidAmount: number;
  dueDate?: string;
  notes?: string;
  color: string;
  createdAt: string;
}

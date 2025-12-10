export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum PeriodType {
  Q1 = 'Q1', // Primera quincena (1-15)
  Q2 = 'Q2', // Segunda quincena (16-End)
  MONTH = 'MONTH',
}

export type Frequency = 'BIWEEKLY' | 'MONTHLY';

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
  quincenaN?: 'Q1' | 'Q2'; // Specifically which quincena this rule belongs to
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

export type ViewState = 'DASHBOARD' | 'TRANSACTIONS' | 'PLANNING' | 'SETTINGS';

export interface DateFilter {
  month: number; // 0-11
  year: number;
  period: PeriodType | 'ALL';
}
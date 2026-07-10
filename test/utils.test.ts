import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatCurrency,
  formatCurrencyCompact,
  roundToTwo,
  filterTransactions,
  generateMissingRecurringTransactions,
  getCategoryEmojiFromGroq,
  generateId,
  calculateTotals,
} from '../utils';
import { TransactionType, RecurrenceRule, Transaction } from '../types';

describe('formatCurrency', () => {
  it('formats whole numbers without decimals', () => {
    const result = formatCurrency(1000);
    expect(result).toContain('1,000');
  });

  it('formats decimal numbers with 2 places', () => {
    const result = formatCurrency(1000.5);
    expect(result).toContain('1,000.50');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('uses MXN locale', () => {
    const result = formatCurrency(100);
    expect(result).toMatch(/^\$|^\d/);
  });
});

describe('formatCurrencyCompact', () => {
  it('shows full number below 10K', () => {
    const result = formatCurrencyCompact(5000);
    expect(result).toContain('5,000');
  });

  it('shows K format above 10K', () => {
    const result = formatCurrencyCompact(15000);
    expect(result).toContain('15.0K');
  });

  it('shows K without decimal above 100K', () => {
    const result = formatCurrencyCompact(150000);
    expect(result).toContain('150K');
  });

  it('shows M format above 1M', () => {
    const result = formatCurrencyCompact(2500000);
    expect(result).toContain('2.5M');
  });

  it('handles negative numbers', () => {
    const result = formatCurrencyCompact(-5000);
    expect(result).toContain('-');
  });
});

describe('roundToTwo', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundToTwo(10.005)).toBe(10.01);
    expect(roundToTwo(10.004)).toBe(10);
  });

  it('handles floating point precision', () => {
    expect(roundToTwo(0.1 + 0.2)).toBe(0.3);
  });
});

describe('filterTransactions', () => {
  const transactions: Transaction[] = [
    { id: '1', amount: 100, type: TransactionType.INCOME, date: '2026-07-15', categoryId: 'c1', accountId: 'a1', isRecurring: false },
    { id: '2', amount: 50, type: TransactionType.EXPENSE, date: '2026-07-20', categoryId: 'c2', accountId: 'a1', isRecurring: false },
    { id: '3', amount: 200, type: TransactionType.INCOME, date: '2026-08-01', categoryId: 'c1', accountId: 'a1', isRecurring: false },
  ];

  it('filters by month and year', () => {
    const result = filterTransactions(transactions, 6, 2026);
    expect(result).toHaveLength(2);
  });

  it('returns empty array for month with no transactions', () => {
    const result = filterTransactions(transactions, 0, 2025);
    expect(result).toHaveLength(0);
  });
});

describe('calculateTotals', () => {
  it('calculates income, expense and balance', () => {
    const transactions: Transaction[] = [
      { id: '1', amount: 1000, type: TransactionType.INCOME, date: '2026-07-01', categoryId: 'c1', accountId: 'a1', isRecurring: false },
      { id: '2', amount: 300, type: TransactionType.EXPENSE, date: '2026-07-02', categoryId: 'c2', accountId: 'a1', isRecurring: false },
      { id: '3', amount: 200, type: TransactionType.EXPENSE, date: '2026-07-03', categoryId: 'c2', accountId: 'a1', isRecurring: false },
    ];
    const totals = calculateTotals(transactions);
    expect(totals.income).toBe(1000);
    expect(totals.expense).toBe(500);
    expect(totals.balance).toBe(500);
  });

  it('returns zeros for empty array', () => {
    const totals = calculateTotals([]);
    expect(totals.income).toBe(0);
    expect(totals.expense).toBe(0);
    expect(totals.balance).toBe(0);
  });
});

describe('generateId', () => {
  it('generates a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('generates unique ids', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});

describe('generateMissingRecurringTransactions', () => {
  const baseRule: RecurrenceRule = {
    id: 'r1',
    frequency: 'MONTHLY',
    startDate: '2026-07-01',
    amount: 500,
    type: TransactionType.EXPENSE,
    categoryId: 'c1',
    accountId: 'a1',
    note: 'Test rule',
    baseDateDay: 15,
  };

  it('generates a transaction when none exists', () => {
    const result = generateMissingRecurringTransactions([baseRule], [], 6, 2026);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(500);
    expect(result[0].type).toBe(TransactionType.EXPENSE);
    expect(result[0].recurrenceRuleId).toBe('r1');
  });

  it('does not generate if transaction already exists', () => {
    const existing: Transaction[] = [{
      id: 't1', amount: 500, type: TransactionType.EXPENSE, date: '2026-07-15',
      categoryId: 'c1', accountId: 'a1', note: '', isRecurring: true, recurrenceRuleId: 'r1',
    }];
    const result = generateMissingRecurringTransactions([baseRule], existing, 6, 2026);
    expect(result).toHaveLength(0);
  });

  it('respects endDate', () => {
    const endedRule: RecurrenceRule = { ...baseRule, endDate: '2026-06-30' };
    const result = generateMissingRecurringTransactions([endedRule], [], 6, 2026);
    expect(result).toHaveLength(0);
  });

  it('skips if rule starts after target month', () => {
    const futureRule: RecurrenceRule = { ...baseRule, startDate: '2026-08-01' };
    const result = generateMissingRecurringTransactions([futureRule], [], 6, 2026);
    expect(result).toHaveLength(0);
  });

  it('respects exceptions', () => {
    const exceptions = [{ ruleId: 'r1', date: '2026-07-15' }];
    const result = generateMissingRecurringTransactions([baseRule], [], 6, 2026, exceptions);
    expect(result).toHaveLength(0);
  });
});

describe('getCategoryEmojiFromGroq', () => {
  beforeEach(() => {
    import.meta.env.VITE_GROQ_API_KEY = undefined;
  });

  it('returns fallback emoji when no API key', async () => {
    const result = await getCategoryEmojiFromGroq('Comida');
    expect(result).toBe('📌');
  });

  it('returns fallback emoji for empty name', async () => {
    const result = await getCategoryEmojiFromGroq('');
    expect(result).toBe('📌');
  });
});

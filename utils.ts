import { PeriodType, Transaction, TransactionType, RecurrenceRule } from './types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
};

export const getQuincena = (dateStr: string): PeriodType => {
  const day = new Date(dateStr + 'T00:00:00').getDate();
  return day <= 15 ? PeriodType.Q1 : PeriodType.Q2;
};

// Generates a unique ID
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const filterTransactions = (
  transactions: Transaction[],
  month: number,
  year: number,
  period: PeriodType | 'ALL'
): Transaction[] => {
  return transactions.filter((t) => {
    // Fix date parsing for timezones by appending T00:00:00
    const d = new Date(t.date + 'T00:00:00');
    const isSameMonth = d.getMonth() === month && d.getFullYear() === year;

    if (!isSameMonth) return false;

    if (period === 'ALL' || period === PeriodType.MONTH) return true;

    const tPeriod = d.getDate() <= 15 ? PeriodType.Q1 : PeriodType.Q2;
    return tPeriod === period;
  });
};

export const calculateTotals = (transactions: Transaction[]) => {
  const income = transactions
    .filter((t) => t.type === TransactionType.INCOME)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const expense = transactions
    .filter((t) => t.type === TransactionType.EXPENSE)
    .reduce((acc, curr) => acc + curr.amount, 0);

  return { income, expense, balance: income - expense };
};

/**
 * Checks active recurrence rules and generates missing transactions for a specific month.
 * Strictly adheres to: Rules only generate if they don't exist.
 */
export const generateMissingRecurringTransactions = (
  rules: RecurrenceRule[],
  existingTransactions: Transaction[],
  targetMonth: number,
  targetYear: number,
  recurrenceExceptions: { ruleId: string; date: string }[] = []
): Transaction[] => {
  const newTransactions: Transaction[] = [];
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

  rules.forEach((rule) => {
    // 1. Check if rule is active for this period
    const ruleStart = new Date(rule.startDate + 'T00:00:00');
    const periodEnd = new Date(targetYear, targetMonth, daysInMonth);

    // If rule starts after this month, skip
    if (ruleStart > periodEnd) return;

    // If rule ended before this month, skip
    if (rule.endDate) {
      const ruleEnd = new Date(rule.endDate + 'T00:00:00');
      const periodStart = new Date(targetYear, targetMonth, 1);
      if (ruleEnd < periodStart) return;
    }

    // 2. Determine expected dates for this month
    const expectedDates: number[] = [];

    // Logic for Monthly AND Biweekly
    // Note: Per requirements, 'BIWEEKLY' now strictly means "Appears once in the selected quincena".

    // Adjust day based on Quincena if frequency is BIWEEKLY
    let day = Math.min(rule.baseDateDay, daysInMonth);

    if (rule.frequency === 'BIWEEKLY' && rule.quincenaN) {
      if (rule.quincenaN === 'Q1' && day > 15) {
        day = 15; // Cap at end of Q1
      } else if (rule.quincenaN === 'Q2' && day <= 15) {
        day = Math.min(day + 15, daysInMonth); // Shift to Q2
      }
    }

    expectedDates.push(day);

    // 3. For each expected date, check if a transaction linked to this rule exists
    expectedDates.forEach((day) => {
      const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dateObj = new Date(dateStr + 'T00:00:00');

      // Check Strict Bounds
      if (dateObj < ruleStart) return;
      if (rule.endDate && dateObj > new Date(rule.endDate + 'T00:00:00')) return;

      // Check if ALREADY exists
      const exists = existingTransactions.some(
        (t) => t.recurrenceRuleId === rule.id && t.date === dateStr
      );

      const isException = recurrenceExceptions.some(
        (e) => e.ruleId === rule.id && e.date === dateStr
      );

      if (!exists && !isException) {
        newTransactions.push({
          id: generateId(),
          amount: rule.amount,
          type: rule.type,
          categoryId: rule.categoryId,
          accountId: rule.accountId,
          date: dateStr,
          note: rule.note + ' (Recurrente)',
          isRecurring: true,
          recurrenceRuleId: rule.id,
        });
      }
    });
  });

  return newTransactions;
};

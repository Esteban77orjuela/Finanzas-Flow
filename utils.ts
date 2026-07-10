import { Transaction, TransactionType, RecurrenceRule } from './types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Compact currency formatter for mobile/tight spaces.
 * - $1,234 → "$1,234"
 * - $12,345 → "$12.3K"  (above 10K)
 * - $123,456 → "$123K"
 * - $1,234,567 → "$1.2M"
 * - Negative numbers get a "−" prefix
 */
export const formatCurrencyCompact = (amount: number): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000;
    return `${sign}$${millions >= 10 ? Math.round(millions) : millions.toFixed(1)}M`;
  }
  if (abs >= 100_000) {
    return `${sign}$${Math.round(abs / 1_000)}K`;
  }
  if (abs >= 10_000) {
    const thousands = abs / 1_000;
    return `${sign}$${thousands >= 100 ? Math.round(thousands) : thousands.toFixed(1)}K`;
  }

  // Below 10K: show full number without unnecessary decimals
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Rounds to 2 decimal places to avoid floating point issues (e.g. 0.1 + 0.2 = 0.300000004)
export const roundToTwo = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/** Calls Groq AI to get an emoji for a category name. Returns 📌 on failure or if no key. */
export async function getCategoryEmojiFromGroq(categoryName: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || !categoryName) return '📌';

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are an emoji recommender for personal finance categories in Spanish. Given a category name, respond with ONLY a single emoji that best represents it. No text, no explanation, just the emoji.' },
          { role: 'user', content: categoryName },
        ],
        temperature: 0.1,
      }),
    });
    const data = await response.json();
    const emoji = data.choices?.[0]?.message?.content?.trim();
    if (emoji && emoji.match(/^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/)) return emoji;
    return '📌';
  } catch {
    return '📌';
  }
}

// Generates a unique ID using crypto.randomUUID() if available, otherwise falls back to a robust random string
export const generateId = (): string => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11);
};

export const filterTransactions = (
  transactions: Transaction[],
  month: number,
  year: number
): Transaction[] => {
  return transactions.filter((t) => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getMonth() === month && d.getFullYear() === year;
  });
};

export const calculateTotals = (transactions: Transaction[]) => {
  const income = transactions
    .filter((t) => t.type === TransactionType.INCOME)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const expense = transactions
    .filter((t) => t.type === TransactionType.EXPENSE)
    .reduce((acc, curr) => acc + curr.amount, 0);

  return {
    income: roundToTwo(income),
    expense: roundToTwo(expense),
    balance: roundToTwo(income - expense),
  };
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

    // 2. Single expected date: the base day clamped to month length
    const day = Math.min(rule.baseDateDay, daysInMonth);
    const expectedDates: number[] = [day];

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
          amount: roundToTwo(rule.amount), // Ensuring rounded amount on generation
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

import { Transaction, TransactionType, RecurrenceRule, Category } from './types';

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

export const exportTransactionsToCSV = (
  transactions: Transaction[],
  categories: Category[]
): void => {
  const headers = ['Fecha', 'Tipo', 'Categoría', 'Monto', 'Nota', 'Recurrente'];
  const rows = transactions.map(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    return [
      t.date,
      t.type === 'INCOME' ? 'Ingreso' : 'Gasto',
      cat?.name || 'Sin categoría',
      t.amount.toFixed(2),
      t.note || '',
      t.isRecurring ? 'Sí' : 'No',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finanzaflow_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const generatePDF = (elementId: string, filename: string) => {
  const el = document.getElementById(elementId);
  if (!el) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <title>${filename}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 20px; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { text-align: left; padding: 8px 12px; background: #f1f5f9; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          .income { color: #059669; font-weight: 600; }
          .expense { color: #dc2626; font-weight: 600; }
          h1 { font-size: 24px; margin-bottom: 4px; }
          .subtitle { color: #64748b; font-size: 14px; margin-bottom: 24px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>${el.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
};

export const calculateAutoSave = (
  currentAmount: number,
  targetAmount: number,
  targetDate: string
): { weekly: number; monthly: number; totalMonths: number } => {
  const remaining = Math.max(targetAmount - currentAmount, 0);
  if (remaining <= 0) return { weekly: 0, monthly: 0, totalMonths: 0 };

  const now = new Date();
  const target = new Date(targetDate + '-01');
  target.setMonth(target.getMonth() + 1);
  target.setDate(0);

  const totalMonths = Math.max(
    (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth(),
    1
  );
  const monthly = remaining / totalMonths;
  const weekly = remaining / (totalMonths * 4.33);

  return { weekly: roundToTwo(weekly), monthly: roundToTwo(monthly), totalMonths };
};

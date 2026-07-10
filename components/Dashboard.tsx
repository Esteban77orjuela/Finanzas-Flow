import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { calculateTotals, formatCurrency, formatCurrencyCompact } from '../utils';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  CalendarClock,
  Receipt,
  Edit2,
  Trash2,
  ArrowUpAZ,
  Calendar,
} from 'lucide-react';

type SortMode = 'ALPHA' | 'DATE';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

interface TransactionRowProps {
  t: Transaction;
  category?: Category;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

const TransactionRow: React.FC<TransactionRowProps> = ({ t, category, onEdit, onDelete }) => {
  const isIncome = t.type === TransactionType.INCOME;
  const dateObj = new Date(t.date + 'T00:00:00');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors group min-h-[4rem] gap-2 sm:gap-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-base shadow-sm opacity-90"
          style={{
            backgroundColor: category?.color ? `${category.color}15` : '#f1f5f9',
          }}
        >
          {category?.icon && category.icon !== 'Tag' && category.icon !== '📌' ? category.icon : (category?.name?.charAt(0).toUpperCase() || '📌')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
            {category?.name || 'Sin Categoría'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {dateObj.getDate()} {dateObj.toLocaleString('es-MX', { month: 'short' })}{' '}
            {t.note && `• ${t.note}`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto pl-12 sm:pl-0">
        <span
          className={`font-semibold text-sm sm:text-base truncate max-w-[130px] sm:max-w-none ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}
          title={formatCurrency(t.amount)}>
          {isIncome ? '+' : '-'}
          <span className="sm:hidden">{formatCurrencyCompact(t.amount)}</span>
          <span className="hidden sm:inline">{formatCurrency(t.amount)}</span>
        </span>

        <div className="flex items-center gap-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(t);
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full transition-all cursor-pointer"
            title="Editar"
          >
            <Edit2 size={14} className="pointer-events-none sm:hidden" />
            <Edit2 size={16} className="pointer-events-none hidden sm:block" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(t.id);
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-full transition-all cursor-pointer"
            title="Eliminar"
          >
            <Trash2 size={14} className="pointer-events-none sm:hidden" />
            <Trash2 size={16} className="pointer-events-none hidden sm:block" />
          </button>
        </div>
      </div>
    </div>
  );
};

const getCategoryName = (categories: Category[], categoryId: string): string => {
  const cat = categories.find((c) => c.id === categoryId);
  return cat?.name || '';
};

const sortTransactions = (
  txs: Transaction[],
  categories: Category[],
  mode: SortMode
): Transaction[] => {
  return [...txs].sort((a, b) => {
    if (mode === 'ALPHA') {
      const nameA = getCategoryName(categories, a.categoryId).toLowerCase();
      const nameB = getCategoryName(categories, b.categoryId).toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return a.date.localeCompare(b.date);
    }
    return a.date.localeCompare(b.date);
  });
};

const SectionList: React.FC<{
  title: string;
  icon: React.ReactNode;
  badge: string;
  badgeColor: string;
  transactions: Transaction[];
  categories: Category[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  emptyIcon: React.ReactNode;
  emptyText: string;
  incomeLabel: string;
  expenseLabel: string;
  incomeCount: number;
  expenseCount: number;
  incomeTotal: number;
  expenseTotal: number;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
}> = ({
  title,
  icon,
  badge,
  badgeColor,
  transactions,
  categories,
  onEdit,
  onDelete,
  emptyIcon,
  emptyText,
  incomeLabel,
  expenseLabel,
  incomeCount,
  expenseCount,
  incomeTotal,
  expenseTotal,
  sortMode,
  onSortChange,
}) => {
  const incomes = useMemo(
    () =>
      sortTransactions(
        transactions.filter((t) => t.type === TransactionType.INCOME),
        categories,
        sortMode
      ),
    [transactions, categories, sortMode]
  );

  const expenses = useMemo(
    () =>
      sortTransactions(
        transactions.filter((t) => t.type === TransactionType.EXPENSE),
        categories,
        sortMode
      ),
    [transactions, categories, sortMode]
  );

  const hasIncomes = incomes.length > 0;
  const hasExpenses = expenses.length > 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-3 sm:p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base truncate">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${badgeColor} flex-shrink-0 whitespace-nowrap`}>
            {badge}
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-5 py-2.5 sm:py-4 grid grid-cols-2 gap-2 sm:gap-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mb-0.5">
            {incomeLabel} <span className="font-mono text-slate-400">({incomeCount})</span>
          </p>
          <p
            className="text-xs sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate"
            title={formatCurrency(incomeTotal)}
          >
            {formatCurrencyCompact(incomeTotal)}
          </p>
        </div>
        <div className="text-right min-w-0">
          <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mb-0.5">
            {expenseLabel} <span className="font-mono text-slate-400">({expenseCount})</span>
          </p>
          <p
            className="text-xs sm:text-lg font-bold text-rose-600 dark:text-rose-400 truncate"
            title={formatCurrency(expenseTotal)}
          >
            {formatCurrencyCompact(expenseTotal)}
          </p>
        </div>
      </div>

      {/* Sort Toggle */}
      <div className="flex items-center gap-1 px-3 sm:px-5 py-2 border-b border-slate-100 dark:border-slate-700">
        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mr-1">
          Orden:
        </span>
        <button
          type="button"
          onClick={() => onSortChange('ALPHA')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
            sortMode === 'ALPHA'
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <ArrowUpAZ size={12} />
          A-Z
        </button>
        <button
          type="button"
          onClick={() => onSortChange('DATE')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
            sortMode === 'DATE'
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Calendar size={12} />
          Fecha
        </button>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[400px] p-2 pr-3 custom-scrollbar relative z-0">
        {!hasIncomes && !hasExpenses ? (
          <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-sm italic">
            {emptyIcon}
            {emptyText}
          </div>
        ) : (
          <div className="space-y-1">
            {hasIncomes && (
              <div className="px-2 pt-2 pb-1">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Ingresos ({incomes.length})
                </span>
              </div>
            )}
            {incomes.map((t) => (
              <TransactionRow
                key={t.id}
                t={t}
                category={categories.find((c) => c.id === t.categoryId)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
            {hasExpenses && (
              <div className="px-2 pt-3 pb-1">
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  Gastos ({expenses.length})
                </span>
              </div>
            )}
            {expenses.map((t) => (
              <TransactionRow
                key={t.id}
                t={t}
                category={categories.find((c) => c.id === t.categoryId)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  categories,
  onEdit,
  onDelete,
}) => {
  const { income, expense, balance } = useMemo(() => calculateTotals(transactions), [transactions]);

  const [fixedSort, setFixedSort] = useState<SortMode>('ALPHA');
  const [variableSort, setVariableSort] = useState<SortMode>('ALPHA');

  const { fixedTransactions, variableTransactions, fixedStats, variableStats } = useMemo(() => {
    const fixed = transactions.filter((t) => t.isRecurring);
    const variable = transactions.filter((t) => !t.isRecurring);

    const calcStats = (txs: Transaction[]) => {
      const inc = txs
        .filter((t) => t.type === TransactionType.INCOME)
        .reduce((acc, t) => acc + t.amount, 0);
      const exp = txs
        .filter((t) => t.type === TransactionType.EXPENSE)
        .reduce((acc, t) => acc + t.amount, 0);
      return { income: inc, expense: exp };
    };

    return {
      fixedTransactions: fixed,
      variableTransactions: variable,
      fixedStats: calcStats(fixed),
      variableStats: calcStats(variable),
    };
  }, [transactions]);

  const fixedIncomeCount = fixedTransactions.filter((t) => t.type === TransactionType.INCOME).length;
  const fixedExpenseCount = fixedTransactions.filter((t) => t.type === TransactionType.EXPENSE).length;
  const variableIncomeCount = variableTransactions.filter((t) => t.type === TransactionType.INCOME).length;
  const variableExpenseCount = variableTransactions.filter((t) => t.type === TransactionType.EXPENSE).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 p-2.5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center gap-1.5 sm:gap-3 mb-1 sm:mb-2">
            <div className="p-1 sm:p-2 bg-blue-50 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 flex-shrink-0">
              <Wallet size={14} className="sm:hidden" />
              <Wallet size={24} className="hidden sm:block" />
            </div>
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[10px] sm:text-sm uppercase tracking-wide hidden sm:block">
              Balance
            </span>
          </div>
          <span
            className={`text-sm sm:text-2xl md:text-3xl font-bold truncate block ${balance >= 0 ? 'text-slate-800 dark:text-white' : 'text-red-500'}`}
            title={formatCurrency(balance)}
          >
            <span className="sm:hidden">{formatCurrencyCompact(balance)}</span>
            <span className="hidden sm:inline">{formatCurrency(balance)}</span>
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wide sm:hidden mt-0.5">
            Balance
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-2.5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center gap-1.5 sm:gap-3 mb-1 sm:mb-2">
            <div className="p-1 sm:p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400 flex-shrink-0">
              <ArrowUpCircle size={14} className="sm:hidden" />
              <ArrowUpCircle size={24} className="hidden sm:block" />
            </div>
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[10px] sm:text-sm uppercase tracking-wide hidden sm:block">
              Ingresos
            </span>
          </div>
          <span
            className="text-sm sm:text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate block"
            title={formatCurrency(income)}
          >
            <span className="sm:hidden">{formatCurrencyCompact(income)}</span>
            <span className="hidden sm:inline">{formatCurrency(income)}</span>
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wide sm:hidden mt-0.5">
            Ingresos
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-2.5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center gap-1.5 sm:gap-3 mb-1 sm:mb-2">
            <div className="p-1 sm:p-2 bg-rose-50 dark:bg-rose-900/30 rounded-full text-rose-600 dark:text-rose-400 flex-shrink-0">
              <ArrowDownCircle size={14} className="sm:hidden" />
              <ArrowDownCircle size={24} className="hidden sm:block" />
            </div>
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[10px] sm:text-sm uppercase tracking-wide hidden sm:block">
              Gastos
            </span>
          </div>
          <span
            className="text-sm sm:text-2xl md:text-3xl font-bold text-rose-600 dark:text-rose-400 truncate block"
            title={formatCurrency(expense)}
          >
            <span className="sm:hidden">{formatCurrencyCompact(expense)}</span>
            <span className="hidden sm:inline">{formatCurrency(expense)}</span>
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wide sm:hidden mt-0.5">
            Gastos
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <SectionList
          title="Fijos y Recurrentes"
          icon={<CalendarClock className="text-amber-500 flex-shrink-0" size={18} />}
          badge="Comprometido"
          badgeColor="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800/30"
          transactions={fixedTransactions}
          categories={categories}
          onEdit={onEdit}
          onDelete={onDelete}
          emptyIcon={<CalendarClock size={24} className="mb-2 opacity-50" />}
          emptyText="Sin movimientos recurrentes"
          incomeLabel="Ingresos Fijos"
          expenseLabel="Gastos Fijos"
          incomeCount={fixedIncomeCount}
          expenseCount={fixedExpenseCount}
          incomeTotal={fixedStats.income}
          expenseTotal={fixedStats.expense}
          sortMode={fixedSort}
          onSortChange={setFixedSort}
        />

        <SectionList
          title="Variables y Diarios"
          icon={<Receipt className="text-indigo-500 flex-shrink-0" size={18} />}
          badge="Actividad"
          badgeColor="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/30"
          transactions={variableTransactions}
          categories={categories}
          onEdit={onEdit}
          onDelete={onDelete}
          emptyIcon={<Receipt size={24} className="mb-2 opacity-50" />}
          emptyText="Sin movimientos variables"
          incomeLabel="Ingresos Extras"
          expenseLabel="Gastos Variables"
          incomeCount={variableIncomeCount}
          expenseCount={variableExpenseCount}
          incomeTotal={variableStats.income}
          expenseTotal={variableStats.expense}
          sortMode={variableSort}
          onSortChange={setVariableSort}
        />
      </div>
    </div>
  );
};

export default Dashboard;

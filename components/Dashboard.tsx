import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, Category, Goal } from '../types';
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
  ChevronDown,
  ChevronRight,
  Trophy,
} from 'lucide-react';

type SortMode = 'ALPHA' | 'DATE';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
  goals: Goal[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onViewGoals: () => void;
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
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row justify-between items-center sm:text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors gap-1 sm:gap-0"
      >
        <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wide text-center sm:text-left">
          {title === 'Fijos y Recurrentes' ? 'Gastos Fijos (Recurrentes)' : 'Gastos Variables'}
        </span>
        <div className="flex items-center gap-2 justify-center sm:justify-end">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Total: {formatCurrency(expenseTotal)}
          </span>
        </div>
      </button>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          collapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100 border-t border-slate-100 dark:border-slate-700'
        }`}
      >
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
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  categories,
  goals,
  onEdit,
  onDelete,
  onViewGoals,
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
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* 3 Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center sm:items-start text-center sm:text-left">
          <span className="text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-sm uppercase tracking-wider mb-2 block">
            Balance Total
          </span>
          <span className={`text-2xl sm:text-3xl md:text-4xl font-bold truncate block ${balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-500'}`} title={formatCurrency(balance)}>
            {formatCurrency(balance)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center sm:items-start text-center sm:text-left">
          <span className="text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-sm uppercase tracking-wider mb-2 block">
            Ingresos del Mes
          </span>
          <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-500 dark:text-emerald-400 truncate block" title={formatCurrency(income)}>
            +{formatCurrency(income)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center sm:items-start text-center sm:text-left">
          <span className="text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-sm uppercase tracking-wider mb-2 block">
            Gastos del Mes
          </span>
          <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-rose-500 dark:text-rose-400 truncate block" title={formatCurrency(expense)}>
            -{formatCurrency(expense)}
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

      {/* Goals Section - Compact Widget */}
      {goals && goals.length > 0 && (
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-2xl border border-violet-200/50 dark:border-violet-800/30 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-violet-600 dark:text-violet-400" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Metas de Ahorro</h3>
            </div>
            <button
              onClick={onViewGoals}
              className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1 transition-colors"
            >
              Ver todas
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.slice(0, 3).map((goal) => {
              const progress = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
              const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
              const targetDate = new Date(goal.targetDate + '-01');
              const targetLabel = targetDate.toLocaleString('es-MX', { month: 'short', year: 'numeric' });

              return (
                <div key={goal.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-all">
                  <div className="h-1.5" style={{ backgroundColor: goal.color }} />
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative w-12 h-12 flex-shrink-0">
                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-100 dark:text-slate-700" />
                          <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" strokeLinecap="round" stroke={goal.color} strokeDasharray={`${(progress / 100) * 94.2} 94.2`} className="transition-all duration-700" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[9px] font-bold" style={{ color: goal.color }}>{progress.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate">{goal.name}</h4>
                        <p className="text-[11px] text-slate-500">{targetLabel}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 dark:text-slate-400">
                        <span className="font-bold text-slate-800 dark:text-white">{formatCurrencyCompact(goal.currentAmount)}</span>
                        <span className="text-slate-400"> / {formatCurrencyCompact(goal.targetAmount)}</span>
                      </span>
                      {progress >= 100 ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                          <Trophy size={12} /> Cumplida
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">Faltan {formatCurrencyCompact(remaining)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

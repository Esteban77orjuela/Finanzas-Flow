import React, { useMemo } from 'react';
import { Transaction, TransactionType, Category, DateFilter } from '../types';
import { calculateTotals, formatCurrency } from '../utils';
import { ArrowUpCircle, ArrowDownCircle, Wallet, CalendarClock, Receipt, ArrowRight } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
  filter: DateFilter;
}

const TransactionRow = ({ t, category }: { t: Transaction; category?: Category }) => {
  const isIncome = t.type === TransactionType.INCOME;
  const dateObj = new Date(t.date + 'T00:00:00');

  return (
    <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors group">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm shadow-sm opacity-90"
          style={{
            backgroundColor: category?.color ? `${category.color}15` : '#f1f5f9',
            color: category?.color || '#64748b'
          }}
        >
          {category?.name.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <p className="font-medium text-sm text-slate-800 dark:text-slate-200">
            {category?.name || 'Sin Categoría'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {dateObj.getDate()} {dateObj.toLocaleString('es-MX', { month: 'short' })} {t.note && `• ${t.note}`}
          </p>
        </div>
      </div>
      <div className="text-right">
        <span className={`font-semibold text-sm block ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
          {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
        </span>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ transactions, categories, filter }) => {
  const { income, expense, balance } = useMemo(() => calculateTotals(transactions), [transactions]);

  // Split transactions into Fixed (Recurring) and Variable (Normal)
  const { fixedTransactions, variableTransactions, fixedStats, variableStats } = useMemo(() => {
    const fixed = transactions.filter(t => t.isRecurring).sort((a, b) => a.date.localeCompare(b.date));
    const variable = transactions.filter(t => !t.isRecurring).sort((a, b) => b.date.localeCompare(a.date)); // Newest first

    const calcStats = (txs: Transaction[]) => {
      const inc = txs.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
      const exp = txs.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
      return { income: inc, expense: exp };
    };

    return {
      fixedTransactions: fixed,
      variableTransactions: variable,
      fixedStats: calcStats(fixed),
      variableStats: calcStats(variable)
    };
  }, [transactions]);

  const getCategory = (id: string) => categories.find(c => c.id === id);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <Wallet size={24} />
            </div>
            <span className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase tracking-wide">Balance Total</span>
          </div>
          <span className={`text-3xl font-bold ${balance >= 0 ? 'text-slate-800 dark:text-white' : 'text-red-500'}`}>
            {formatCurrency(balance)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
              <ArrowUpCircle size={24} />
            </div>
            <span className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase tracking-wide">Ingresos</span>
          </div>
          <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(income)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-full text-rose-600 dark:text-rose-400">
              <ArrowDownCircle size={24} />
            </div>
            <span className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase tracking-wide">Gastos</span>
          </div>
          <span className="text-3xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(expense)}
          </span>
        </div>
      </div>

      {/* Detail Sections: Fixed vs Variable */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Fixed / Recurring Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CalendarClock className="text-amber-500" size={20} />
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Fijos y Recurrentes</h3>
            </div>
            <div className="text-xs font-medium px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800/30">
              Comprometido
            </div>
          </div>

          <div className="px-5 py-4 grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ingresos Fijos</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(fixedStats.income)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Gastos Fijos</p>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{formatCurrency(fixedStats.expense)}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[400px] p-2 custom-scrollbar">
            {fixedTransactions.length > 0 ? (
              <div className="space-y-1">
                {fixedTransactions.map(t => <TransactionRow key={t.id} t={t} category={getCategory(t.categoryId)} />)}
              </div>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-sm italic">
                <CalendarClock size={24} className="mb-2 opacity-50" />
                Sin movimientos recurrentes
              </div>
            )}
          </div>
        </div>

        {/* Variable / Normal Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Receipt className="text-indigo-500" size={20} />
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Variables y Diarios</h3>
            </div>
            <div className="text-xs font-medium px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/30">
              Actividad
            </div>
          </div>

          <div className="px-5 py-4 grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ingresos Extras</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(variableStats.income)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Gastos Variables</p>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{formatCurrency(variableStats.expense)}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[400px] p-2 custom-scrollbar">
            {variableTransactions.length > 0 ? (
              <div className="space-y-1">
                {variableTransactions.map(t => <TransactionRow key={t.id} t={t} category={getCategory(t.categoryId)} />)}
              </div>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-sm italic">
                <Receipt size={24} className="mb-2 opacity-50" />
                Sin movimientos variables
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
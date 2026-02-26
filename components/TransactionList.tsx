import React from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { formatCurrency } from '../utils';
import { Edit2, Trash2, Repeat } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  categories,
  onEdit,
  onDelete,
}) => {
  // Sort by date desc
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-block p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
          <span className="text-4xl">📭</span>
        </div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Sin transacciones</h3>
        <p className="text-slate-500 dark:text-slate-400">No hay movimientos en este periodo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((t) => {
        const category = categories.find((c) => c.id === t.categoryId);
        const isIncome = t.type === TransactionType.INCOME;

        return (
          <div
            key={t.id}
            className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all gap-4 sm:gap-0"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div
                className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center text-lg shadow-sm
                  ${isIncome ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'}`}
                style={
                  category?.color
                    ? { backgroundColor: `${category.color}20`, color: category.color }
                    : {}
                }
              >
                {/* Fallback icon logic would go here, using emoji for simplicity now */}
                {isIncome ? '💰' : '🏷️'}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 truncate">
                  <span className="truncate">{category?.name || 'Sin Categoría'}</span>
                  {t.isRecurring && <Repeat size={12} className="text-slate-400 flex-shrink-0" />}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  {t.note && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="truncate max-w-[120px] sm:max-w-xs">{t.note}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-16 sm:pl-0">
              <span
                className={`font-bold text-base whitespace-nowrap ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}
              >
                {isIncome ? '+' : '-'}
                {formatCurrency(t.amount)}
              </span>

              <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(t);
                  }}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(t.id);
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TransactionList;

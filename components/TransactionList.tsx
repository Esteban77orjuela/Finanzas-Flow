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

const TransactionList: React.FC<TransactionListProps> = ({ transactions, categories, onEdit, onDelete }) => {
  
  // Sort by date desc
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
        const category = categories.find(c => c.id === t.categoryId);
        const isIncome = t.type === TransactionType.INCOME;
        
        return (
          <div key={t.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg shadow-sm
                  ${isIncome ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'}`}
                style={category?.color ? { backgroundColor: `${category.color}20`, color: category.color } : {}}
              >
                {/* Fallback icon logic would go here, using emoji for simplicity now */}
                {isIncome ? '💰' : '🏷️'} 
              </div>
              
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  {category?.name || 'Sin Categoría'}
                  {t.isRecurring && <Repeat size={12} className="text-slate-400" />}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{new Date(t.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                  {t.note && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-[150px]">{t.note}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className={`font-bold text-base ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
              </span>
              
              <div className="flex gap-1 opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); console.log('Edit clicked:', t); onEdit(t); }} className="p-2 text-slate-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                  <Edit2 size={16} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); console.log('Delete clicked:', t.id); onDelete(t.id); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
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
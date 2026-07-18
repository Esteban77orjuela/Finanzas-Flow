import React from 'react';
import { PlusCircle, MinusCircle, Sparkles, Tag } from 'lucide-react';

interface QuickActionPanelProps {
  onAddIncome: () => void;
  onAddExpense: () => void;
  onOpenAI: () => void;
  onAddCategory: () => void;
}

const QuickActionPanel: React.FC<QuickActionPanelProps> = ({
  onAddIncome,
  onAddExpense,
  onOpenAI,
  onAddCategory,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-6 sm:mb-8">
      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 mr-2 hidden sm:block">Acciones rápidas:</span>
      
      {/* Add Expense Card */}
      <button
        onClick={onAddExpense}
        className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-full text-sm font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-all shadow-sm hover:shadow-md"
      >
        <MinusCircle size={16} />
        Gasto
      </button>

      {/* Add Income Card */}
      <button
        onClick={onAddIncome}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition-all shadow-sm hover:shadow-md"
      >
        <PlusCircle size={16} />
        Ingreso
      </button>

      {/* Add Category Card */}
      <button
        onClick={onAddCategory}
        className="flex items-center gap-2 px-4 py-2 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-full text-sm font-bold hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-transparent hover:border-sky-200 dark:hover:border-sky-800 transition-all shadow-sm hover:shadow-md"
      >
        <Tag size={16} />
        Categoría
      </button>

      {/* AI Assistant Card */}
      <button
        onClick={onOpenAI}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full text-sm font-bold hover:brightness-110 transition-all shadow-md hover:shadow-lg sm:ml-auto"
      >
        <Sparkles size={16} className="text-yellow-300" />
        Usar IA
      </button>
    </div>
  );
};

export default QuickActionPanel;

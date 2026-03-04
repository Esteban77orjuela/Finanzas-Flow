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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
      {/* Add Expense Card */}
      <button
        onClick={onAddExpense}
        className="group relative overflow-hidden bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-rose-500/10 hover:border-rose-200 dark:hover:border-rose-900/30 flex flex-col items-center gap-2 sm:gap-4 text-center"
      >
        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
          <MinusCircle size={24} className="sm:hidden" />
          <MinusCircle size={28} className="hidden sm:block" />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors text-xs sm:text-base">
            Gasto
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Registra una salida
          </p>
        </div>
      </button>

      {/* Add Income Card */}
      <button
        onClick={onAddIncome}
        className="group relative overflow-hidden bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-200 dark:hover:border-emerald-900/30 flex flex-col items-center gap-2 sm:gap-4 text-center"
      >
        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
          <PlusCircle size={24} className="sm:hidden" />
          <PlusCircle size={28} className="hidden sm:block" />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-xs sm:text-base">
            Ingreso
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Aumenta capital
          </p>
        </div>
      </button>

      {/* Add Category Card */}
      <button
        onClick={onAddCategory}
        className="group relative overflow-hidden bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-sky-500/10 hover:border-sky-200 dark:hover:border-sky-900/30 flex flex-col items-center gap-2 sm:gap-4 text-center"
      >
        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-sky-50 dark:bg-sky-900/30 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
          <Tag size={24} className="sm:hidden" />
          <Tag size={28} className="hidden sm:block" />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors text-xs sm:text-base">
            Categoría
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Organiza conceptos
          </p>
        </div>
      </button>

      {/* AI Assistant Card */}
      <button
        onClick={onOpenAI}
        className="group relative overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-700 p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all hover:-translate-y-1 flex flex-col items-center gap-2 sm:gap-4 text-center border border-white/10"
      >
        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white group-hover:rotate-12 transition-transform">
          <Sparkles size={24} className="text-yellow-300 sm:hidden" />
          <Sparkles size={28} className="text-yellow-300 hidden sm:block" />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-white text-xs sm:text-base">Asistente</h4>
          <p className="text-[10px] text-indigo-100 hidden sm:block">Usa la IA</p>
        </div>
      </button>
    </div>
  );
};

export default QuickActionPanel;

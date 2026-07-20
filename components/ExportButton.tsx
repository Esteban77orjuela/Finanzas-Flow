import React from 'react';
import { Transaction, Category } from '../types';
import { exportTransactionsToCSV } from '../utils';
import { Download, FileSpreadsheet } from 'lucide-react';

interface ExportButtonProps {
  transactions: Transaction[];
  categories: Category[];
}

const ExportButton: React.FC<ExportButtonProps> = ({ transactions, categories }) => {
  if (transactions.length === 0) return null;

  return (
    <button
      onClick={() => exportTransactionsToCSV(transactions, categories)}
      className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
      title="Exportar a CSV"
    >
      <FileSpreadsheet size={16} className="text-emerald-500" />
      <span className="hidden sm:inline">Exportar CSV</span>
      <Download size={14} className="sm:hidden" />
    </button>
  );
};

export default ExportButton;

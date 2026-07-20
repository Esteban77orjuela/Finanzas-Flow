import React from 'react';
import { Transaction, Category, TransactionType } from '../types';
import { Filter, X } from 'lucide-react';

export interface FilterState {
  search: string;
  type: TransactionType | 'ALL';
  categoryId: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
}

interface AdvancedFiltersProps {
  categories: Category[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const defaultFilters: FilterState = {
  search: '',
  type: 'ALL',
  categoryId: '',
  dateFrom: '',
  dateTo: '',
  minAmount: '',
  maxAmount: '',
};

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ categories, filters, onChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasActiveFilters = Object.values(filters).some(v => v !== '' && v !== 'ALL');

  const clearFilters = () => onChange(defaultFilters);

  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
            hasActiveFilters
              ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Filter size={14} />
          Filtros
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-primary-500" />
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-500 hover:text-rose-500 transition-colors"
          >
            <X size={12} />
            Limpiar
          </button>
        )}
      </div>

      {isOpen && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Buscar por nota..."
              value={filters.search}
              onChange={e => update('search', e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
            />
            <select
              value={filters.type}
              onChange={e => update('type', e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">Todos los tipos</option>
              <option value="INCOME">Ingresos</option>
              <option value="EXPENSE">Gastos</option>
            </select>
            <select
              value={filters.categoryId}
              onChange={e => update('categoryId', e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="">Todas las categorías</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon || '📌'} {c.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Monto mín"
                value={filters.minAmount}
                onChange={e => update('minAmount', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              />
              <input
                type="number"
                placeholder="Monto máx"
                value={filters.maxAmount}
                onChange={e => update('maxAmount', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-[10px] text-slate-500 font-medium block mb-1">Desde</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => update('dateFrom', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-medium block mb-1">Hasta</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => update('dateTo', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { defaultFilters };
export default AdvancedFilters;

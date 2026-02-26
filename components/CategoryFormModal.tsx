import React, { useState } from 'react';
import { Category, TransactionType } from '../types';
import { generateId } from '../utils';
import { X, Check, Palette, Tag } from 'lucide-react';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (category: Category) => void;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Fixed colors: Emerald for Income, Rose for Expense
    const fixedColor = type === TransactionType.INCOME ? '#10b981' : '#f43f5e';

    const newCategory: Category = {
      id: generateId(),
      name: name.trim(),
      type,
      color: fixedColor,
      icon: 'Tag',
    };

    onAdd(newCategory);
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10">
        {/* Header */}
        <div
          className={`relative p-6 bg-gradient-to-r ${type === TransactionType.INCOME ? 'from-emerald-600 to-teal-600' : 'from-rose-600 to-pink-600'} text-white transition-all duration-300`}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Tag size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Nueva Categoría</h2>
              <p className="text-white/80 text-sm">Organiza mejor tus finanzas</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Type Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center block">
              Tipo de Categoría
            </label>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                  type === TransactionType.EXPENSE
                    ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-lg'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                onClick={() => setType(TransactionType.EXPENSE)}
              >
                Gasto
              </button>
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                  type === TransactionType.INCOME
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-lg'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                onClick={() => setType(TransactionType.INCOME)}
              >
                Ingreso
              </button>
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Nombre de categoría
            </label>
            <input
              type="text"
              autoFocus
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-slate-300 dark:focus:border-slate-600 rounded-2xl text-lg font-medium outline-none transition-all dark:text-white"
              placeholder="Ej: Netflix, Salario, Comida..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Color Insight */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <div
              className={`w-4 h-4 rounded-full ${type === TransactionType.INCOME ? 'bg-emerald-500' : 'bg-rose-500'}`}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Esta categoría usará el color{' '}
              <span className="font-bold underline">
                {type === TransactionType.INCOME ? 'Verde' : 'Rojo'}
              </span>{' '}
              para mantener el orden visual.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!name.trim()}
            className={`w-full py-4 ${type === TransactionType.INCOME ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-600 shadow-rose-500/20'} hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]`}
          >
            <Check size={24} />
            Crear Categoría
          </button>
        </form>
      </div>
    </div>
  );
};

export default CategoryFormModal;

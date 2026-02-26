import React, { useState } from 'react';
import { Category, TransactionType } from '../types';
import { Trash2, Edit3, Check, X, Tag, AlertCircle, Plus } from 'lucide-react';

interface CategorySettingsProps {
  categories: Category[];
  onAdd: (category: Category) => void;
  onUpdate: (category: Category) => void;
  onDelete: (id: string) => void;
  onOpenAddModal: () => void;
}

const CategorySettings: React.FC<CategorySettingsProps> = ({
  categories,
  onUpdate,
  onDelete,
  onOpenAddModal,
}) => {
  const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.EXPENSE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  const startEditing = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleUpdate = (cat: Category) => {
    if (!editName.trim()) return;
    onUpdate({ ...cat, name: editName.trim() });
    setEditingId(null);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400 shadow-inner">
            <Tag size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              Gestión de Categorías
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Personaliza cómo organizas tu dinero
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
        >
          <Plus size={20} />
          Nueva
        </button>
      </div>

      {/* Modern Tabs */}
      <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab(TransactionType.EXPENSE)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all ${
            activeTab === TransactionType.EXPENSE
              ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-xl'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${activeTab === TransactionType.EXPENSE ? 'bg-rose-500' : 'bg-slate-300'}`}
          />
          Gastos
        </button>
        <button
          onClick={() => setActiveTab(TransactionType.INCOME)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all ${
            activeTab === TransactionType.INCOME
              ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xl'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${activeTab === TransactionType.INCOME ? 'bg-emerald-500' : 'bg-slate-300'}`}
          />
          Ingresos
        </button>
      </div>

      {/* Categories Grid/List */}
      <div className="grid gap-3">
        {filteredCategories.map((cat) => (
          <div
            key={cat.id}
            className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:border-indigo-300 dark:hover:border-indigo-900/50 transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div
                className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-bold shadow-sm"
                style={{ backgroundColor: cat.color }}
              >
                {cat.name.charAt(0).toUpperCase()}
              </div>

              {editingId === cat.id ? (
                <div className="flex items-center gap-2 flex-1 animate-fade-in">
                  <input
                    type="text"
                    autoFocus
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-indigo-500 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium outline-none"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdate(cat);
                      if (e.key === 'Escape') cancelEditing();
                    }}
                  />
                  <button
                    onClick={() => handleUpdate(cat)}
                    className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="min-w-0">
                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate block">
                    {cat.name}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                    {activeTab === TransactionType.EXPENSE ? 'Debito' : 'Credito'}
                  </span>
                </div>
              )}
            </div>

            {editingId !== cat.id && (
              <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                <button
                  onClick={() => startEditing(cat)}
                  className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
                  title="Editar"
                >
                  <Edit3 size={18} />
                </button>
                <button
                  onClick={() => onDelete(cat.id)}
                  className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-sm mb-4">
              <Tag size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium italic">
              No hay categorías definidas de{' '}
              {activeTab === TransactionType.EXPENSE ? 'gasto' : 'ingreso'}.
            </p>
          </div>
        )}
      </div>

      {/* Helpful Hint Section */}
      <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-3xl border border-amber-100 dark:border-amber-900/30 flex gap-4">
        <div className="p-2 bg-white dark:bg-slate-800 rounded-xl text-amber-500 shrink-0 h-fit shadow-sm">
          <AlertCircle size={24} />
        </div>
        <div>
          <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm mb-1">
            Dato importante
          </h4>
          <p className="text-xs text-amber-800/70 dark:text-amber-300/60 leading-relaxed font-medium">
            Al eliminar una categoría, las transacciones antiguas no se borrarán, pero aparecerán
            marcadas para que sepas qué pasó.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CategorySettings;

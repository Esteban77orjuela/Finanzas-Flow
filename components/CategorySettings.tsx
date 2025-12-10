import React, { useState } from 'react';
import { Category, TransactionType } from '../types';
import { generateId } from '../utils';
import { Trash2, Plus, X, Check, Tag, AlertCircle } from 'lucide-react';

interface CategorySettingsProps {
  categories: Category[];
  onAdd: (category: Category) => void;
  onDelete: (id: string) => void;
}

const PRESET_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#f43f5e', // Rose
  '#64748b', // Slate
];

const CategorySettings: React.FC<CategorySettingsProps> = ({ categories, onAdd, onDelete }) => {
  const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.EXPENSE);
  const [isAdding, setIsAdding] = useState(false);
  
  // New Category State
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const filteredCategories = categories.filter(c => c.type === activeTab);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newCategory: Category = {
      id: generateId(),
      name: newName.trim(),
      type: activeTab,
      color: selectedColor,
    };

    onAdd(newCategory);
    setNewName('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-primary-600 dark:text-primary-400">
          <Tag size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Categorías</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Personaliza tus conceptos de gastos e ingresos</p>
        </div>
      </div>

      {/* Type Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          onClick={() => setActiveTab(TransactionType.EXPENSE)}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === TransactionType.EXPENSE
              ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          Gastos
        </button>
        <button
          onClick={() => setActiveTab(TransactionType.INCOME)}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === TransactionType.INCOME
              ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          Ingresos
        </button>
      </div>

      {/* Category List */}
      <div className="space-y-3">
        {filteredCategories.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full shadow-sm"
                style={{ backgroundColor: cat.color }}
              />
              <span className="font-medium text-slate-800 dark:text-slate-200">{cat.name}</span>
            </div>
            <button 
              onClick={() => onDelete(cat.id)}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        
        {filteredCategories.length === 0 && !isAdding && (
          <div className="text-center py-8 text-slate-400 dark:text-slate-600 italic text-sm">
            No hay categorías definidas.
          </div>
        )}
      </div>

      {/* Add New Category Form */}
      {isAdding ? (
        <form onSubmit={handleSave} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nombre</label>
            <input 
              type="text" 
              autoFocus
              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={`Ej: ${activeTab === TransactionType.EXPENSE ? 'Gimnasio' : 'Ventas'}`}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              spellCheck
              lang="es"
            />
          </div>

          <div>
             <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Color</label>
             <div className="flex flex-wrap gap-2">
               {PRESET_COLORS.map(color => (
                 <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none ring-2 ring-offset-1 dark:ring-offset-slate-900 ${selectedColor === color ? 'ring-slate-400 scale-110' : 'ring-transparent'}`}
                    style={{ backgroundColor: color }}
                 />
               ))}
             </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button 
              type="button" 
              onClick={() => setIsAdding(false)}
              className="flex-1 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={!newName.trim()}
              className="flex-1 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg shadow-sm flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Guardar
            </button>
          </div>
        </form>
      ) : (
        <button 
          onClick={() => {
            setIsAdding(true);
            setNewName('');
          }}
          className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:border-primary-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all flex items-center justify-center gap-2 font-medium"
        >
          <Plus size={20} />
          Nueva Categoría
        </button>
      )}

      {/* Info Tip */}
      <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30 flex gap-3 text-xs text-blue-800 dark:text-blue-300">
        <AlertCircle size={16} className="shrink-0 mt-0.5" />
        <p>
          Las categorías eliminadas se mantendrán en el historial de transacciones pasadas, pero aparecerán marcadas.
        </p>
      </div>
    </div>
  );
};

export default CategorySettings;
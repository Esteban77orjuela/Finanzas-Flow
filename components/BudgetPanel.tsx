import React, { useState, useMemo } from 'react';
import { Transaction, Category, Budget, TransactionType } from '../types';
import { formatCurrency, roundToTwo, generateId } from '../utils';
import { Wallet, Plus, Trash2, AlertTriangle, PiggyBank } from 'lucide-react';

interface BudgetPanelProps {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  onSaveBudget: (budget: Budget) => void;
  onDeleteBudget: (id: string) => void;
}

const BudgetPanel: React.FC<BudgetPanelProps> = ({ transactions, categories, budgets, onSaveBudget, onDeleteBudget }) => {
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');

  const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE);

  const budgetedCategoryIds = budgets.map(b => b.categoryId);

  const spendingByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .forEach(t => {
        map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
      });
    return map;
  }, [transactions]);

  const handleAdd = () => {
    if (!selectedCategory || !budgetAmount) return;
    const amount = parseFloat(budgetAmount);
    if (isNaN(amount) || amount <= 0) return;
    onSaveBudget({
      id: generateId(),
      categoryId: selectedCategory,
      amount: roundToTwo(amount),
      month: new Date().getMonth(),
      year: new Date().getFullYear(),
    });
    setSelectedCategory('');
    setBudgetAmount('');
    setShowForm(false);
  };

  const availableCategories = expenseCategories.filter(c => !budgetedCategoryIds.includes(c.id));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-primary-500" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Presupuestos</h3>
        </div>
        {availableCategories.length > 0 && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-all"
          >
            <Plus size={14} />
            {showForm ? 'Cancelar' : 'Añadir'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 space-y-3 animate-fade-in">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="">Seleccionar categoría</option>
            {availableCategories.map(c => (
              <option key={c.id} value={c.id}>{c.icon || '📌'} {c.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              value={budgetAmount}
              onChange={e => setBudgetAmount(e.target.value)}
              placeholder="Monto mensual"
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              min="0"
              step="0.01"
            />
            <button
              onClick={handleAdd}
              disabled={!selectedCategory || !budgetAmount}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {budgets.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <PiggyBank size={32} className="mx-auto mb-2 opacity-50" />
            Sin presupuestos definidos
          </div>
        ) : (
          budgets.map(budget => {
            const cat = categories.find(c => c.id === budget.categoryId);
            const spent = spendingByCategory[budget.categoryId] || 0;
            const percentage = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0;
            const isOverBudget = spent > budget.amount;
            const isNearLimit = percentage >= 80 && !isOverBudget;

            return (
              <div key={budget.id} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{cat?.icon || '📌'}</span>
                    <span className="font-medium text-sm text-slate-700 dark:text-slate-300 truncate">{cat?.name || 'Sin categoría'}</span>
                  </div>
                  <button
                    onClick={() => onDeleteBudget(budget.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span className={isOverBudget ? 'text-rose-500 font-bold' : isNearLimit ? 'text-amber-500 font-bold' : ''}>
                    {formatCurrency(spent)} gastados
                  </span>
                  <span>de {formatCurrency(budget.amount)}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className={`rounded-full h-2 transition-all duration-500 ${
                      isOverBudget ? 'bg-rose-500' : isNearLimit ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                {isOverBudget && (
                  <div className="flex items-center gap-1 mt-1.5 text-[11px] text-rose-500 font-medium">
                    <AlertTriangle size={12} />
                    Excediste el presupuesto en {formatCurrency(spent - budget.amount)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BudgetPanel;

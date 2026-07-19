import React, { useState } from 'react';
import { Transaction, TransactionType, Category, Account, Goal, Debt } from '../types';
import { generateId } from '../utils';
import { X, Check, Repeat, CalendarClock, AlertCircle, Plus, Tag } from 'lucide-react';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    transaction: Transaction,
    recurrenceOptions?: {
      createRule: boolean;
      frequency: 'MONTHLY';
      updateFuture: boolean;
    }
  ) => void;
  onAddCategory: (category: Category) => void;
  categories: Category[];
  accounts: Account[];
  initialData?: Transaction | null;
  defaultType?: TransactionType;
  goals?: Goal[];
  debts?: Debt[];
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen,
  onClose,
  onSave,
  onAddCategory,
  categories,
  accounts,
  initialData,
  defaultType = TransactionType.EXPENSE,
  goals = [],
  debts = [],
}) => {
  // Initialize state directly from props at mount time
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [type, setType] = useState<TransactionType>(initialData?.type || defaultType);

  // Find first category of matching type if creating new
  const firstCategory = categories.filter((c) => c.type === (initialData?.type || defaultType))[0];
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || firstCategory?.id || '');

  const [accountId, setAccountId] = useState(initialData?.accountId || accounts[0]?.id || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState(initialData?.note || '');

  // Recurrence State
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);

  // Edit Mode State
  const [updateFuture, setUpdateFuture] = useState(false);

  // Quick Category Add State
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Linking State
  const [linkedGoalId, setLinkedGoalId] = useState(initialData?.linkedGoalId || '');
  const [linkedDebtId, setLinkedDebtId] = useState(initialData?.linkedDebtId || '');

  React.useEffect(() => {
    if (isOpen) {
      setAmount(initialData?.amount?.toString() || '');
      setType(initialData?.type || defaultType);
      
      const cats = categories.filter((c) => c.type === (initialData?.type || defaultType));
      setCategoryId(initialData?.categoryId || cats[0]?.id || '');
      setAccountId(initialData?.accountId || accounts[0]?.id || '');
      setDate(initialData?.date || new Date().toISOString().split('T')[0]);
      setNote(initialData?.note || '');
      setIsRecurring(initialData?.isRecurring || false);
      setUpdateFuture(false);
      setIsCreatingCategory(false);
      setNewCategoryName('');
      setLinkedGoalId(initialData?.linkedGoalId || '');
      setLinkedDebtId(initialData?.linkedDebtId || '');
    }
  }, [isOpen, initialData, defaultType, categories, accounts]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setIsCreatingCategory(false);

    // Auto-select first category of the new type
    const availableCats = categories.filter((c) => c.type === newType);
    if (availableCats.length > 0) {
      setCategoryId(availableCats[0].id);
    } else {
      setCategoryId('');
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;

    const newId = generateId();
    // Pick a semi-random color from a small palette
    const colors = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newCat: Category = {
      id: newId,
      name: newCategoryName.trim(),
      type: type,
      color: randomColor,
    };

    onAddCategory(newCat);
    setCategoryId(newId);
    setIsCreatingCategory(false);
    setNewCategoryName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount || '0');
    if (amountNum <= 0 || !categoryId || !accountId) {
      alert('Por favor, ingresa un monto válido y selecciona una categoría.');
      return;
    }

    const transaction: Transaction = {
      id: initialData ? initialData.id : generateId(),
      amount: amountNum,
      type,
      date,
      categoryId,
      accountId,
      note,
      isRecurring,
      recurrenceRuleId: initialData?.recurrenceRuleId, // Keep link if simple edit, logic in parent handles breaking it
      linkedGoalId: linkedGoalId || undefined,
      linkedDebtId: linkedDebtId || undefined,
    };

    onSave(transaction, {
      createRule: isRecurring && !(initialData?.isRecurring),
      frequency: 'MONTHLY',
      updateFuture,
    });

    onClose();
  };

  if (!isOpen) return null;

  const currentTypeCategories = categories.filter((c) => c.type === type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            {initialData ? 'Editar Transacción' : 'Nueva Transacción'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                type === TransactionType.INCOME
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
              onClick={() => handleTypeChange(TransactionType.INCOME)}
            >
              Ingreso
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                type === TransactionType.EXPENSE
                  ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
              onClick={() => handleTypeChange(TransactionType.EXPENSE)}
            >
              Gasto
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">
              Monto
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                $
              </span>
              <input
                type="number"
                step="0.01"
                required
                className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-2xl font-bold text-slate-800 dark:text-white"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus={!isCreatingCategory}
              />
            </div>
          </div>

          {/* Date & Account */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Fecha
              </label>
              <input
                type="date"
                required
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                value={date}
                onChange={handleDateChange}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Cuenta
              </label>
              <select
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Section with Quick Add */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                Categoría
              </label>
              {!isCreatingCategory && (
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(true)}
                  className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1 hover:underline"
                >
                  <Plus size={12} /> Nueva
                </button>
              )}
            </div>

            {isCreatingCategory ? (
              <div className="flex gap-2 animate-fade-in">
                <input
                  type="text"
                  className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-primary-300 dark:border-primary-700 rounded-lg text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Nombre de categoría..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  autoFocus
                  spellCheck
                  lang="es"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim()}
                  className="p-2.5 bg-primary-600 text-white rounded-lg disabled:opacity-50"
                >
                  <Check size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(false)}
                  className="p-2.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <select
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none appearance-none"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="" disabled>
                    {currentTypeCategories.length === 0
                      ? 'Sin categorías disponibles'
                      : 'Seleccionar...'}
                  </option>
                  {currentTypeCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {/* Chevron Icon for select */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Tag size={16} />
                </div>

                {currentTypeCategories.length === 0 && (
                  <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5" />
                    <p>
                      No tienes categorías de{' '}
                      {type === TransactionType.INCOME ? 'Ingreso' : 'Gasto'}. Crea una arriba.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Nota (Opcional)
            </label>
            <input
              type="text"
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="Ej: Supermercado"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              spellCheck
              lang="es"
            />
          </div>

          {/* Linking Section (Optional) */}
          {(goals.length > 0 || debts.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {goals.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                    Vincular a Meta
                  </label>
                  <select
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                    value={linkedGoalId}
                    onChange={(e) => { setLinkedGoalId(e.target.value); setLinkedDebtId(''); }}
                  >
                    <option value="">Ninguna</option>
                    {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              )}
              {debts.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                    Vincular a Deuda
                  </label>
                  <select
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                    value={linkedDebtId}
                    onChange={(e) => { setLinkedDebtId(e.target.value); setLinkedGoalId(''); }}
                  >
                    <option value="">Ninguna</option>
                    {debts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Recurring Toggle */}
          {(!initialData || !initialData.isRecurring) && (
            <div className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${isRecurring ? 'bg-primary-100 text-primary-600' : 'bg-slate-200 text-slate-500'}`}
                >
                  <Repeat size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Pago Recurrente
                  </p>
                  <p className="text-xs text-slate-500">
                    Se agregará automáticamente cada mes.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {/* If EDITING a Recurring Transaction: Edit options */}
          {initialData && initialData.isRecurring && initialData.recurrenceRuleId && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30">
              <div className="flex items-start gap-3">
                <CalendarClock className="text-amber-600 mt-1" size={18} />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    Es una transacción recurrente
                  </p>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editMode"
                      checked={!updateFuture}
                      onChange={() => setUpdateFuture(false)}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Editar solo esta (Instancia única)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editMode"
                      checked={updateFuture}
                      onChange={() => setUpdateFuture(true)}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      <span>Actualizar regla futura</span>
                      <p className="text-[10px] text-slate-500 block">
                        No afecta meses anteriores (Crea nueva regla).
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!categoryId}
            className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center justify-center gap-2"
          >
            <Check size={20} />
            {initialData ? 'Actualizar' : 'Guardar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;

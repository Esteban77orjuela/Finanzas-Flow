import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, Category, Account, Frequency, PeriodType } from '../types';
import { generateId, getQuincena } from '../utils';
import { X, Check, Repeat, CalendarClock, AlertCircle, Plus, Tag } from 'lucide-react';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    transaction: Transaction, 
    recurrenceOptions?: { 
      createRule: boolean, 
      frequency: Frequency, 
      quincenaN?: 'Q1' | 'Q2',
      updateFuture: boolean 
    }
  ) => void;
  onAddCategory: (category: Category) => void;
  categories: Category[];
  accounts: Account[];
  initialData?: Transaction | null;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen,
  onClose,
  onSave,
  onAddCategory,
  categories,
  accounts,
  initialData,
}) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  
  // Recurrence State
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('MONTHLY');
  const [quincenaType, setQuincenaType] = useState<'Q1' | 'Q2'>('Q1');
  
  // Edit Mode State
  const [updateFuture, setUpdateFuture] = useState(false);

  // Quick Category Add State
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setAmount(initialData.amount.toString());
        setType(initialData.type);
        setCategoryId(initialData.categoryId);
        setAccountId(initialData.accountId);
        setDate(initialData.date);
        setNote(initialData.note || '');
        setIsRecurring(initialData.isRecurring);
        
        // Infer frequency or Q type from date if not explicitly available
        const currentQ = getQuincena(initialData.date);
        setQuincenaType(currentQ === PeriodType.Q1 ? 'Q1' : 'Q2');
        
        setUpdateFuture(false);
      } else {
        // Reset defaults
        setAmount('');
        setType(TransactionType.EXPENSE);
        // Do not force first category, user might want to create one
        const availableCats = categories.filter(c => c.type === TransactionType.EXPENSE);
        setCategoryId(availableCats.length > 0 ? availableCats[0].id : '');
        setAccountId(accounts.length > 0 ? accounts[0].id : '');
        
        const todayStr = new Date().toISOString().split('T')[0];
        setDate(todayStr);
        setNote('');
        setIsRecurring(false);
        setFrequency('MONTHLY');
        
        // Default Q based on today
        const todayQ = getQuincena(todayStr);
        setQuincenaType(todayQ === PeriodType.Q1 ? 'Q1' : 'Q2');
        
        setUpdateFuture(false);
        setIsCreatingCategory(false);
      }
    }
  }, [isOpen, initialData, categories, accounts]);

  // When Type changes, we might need to reset category selection or exit creation mode
  useEffect(() => {
    if (!isOpen) return;
    setIsCreatingCategory(false);
    const availableCats = categories.filter(c => c.type === type);
    if (availableCats.length > 0) {
      setCategoryId(availableCats[0].id);
    } else {
      setCategoryId('');
    }
  }, [type, categories, isOpen]);

  // Handle date change -> update Q type automatically
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDate(newDate);
    if (newDate) {
      const q = getQuincena(newDate);
      setQuincenaType(q === PeriodType.Q1 ? 'Q1' : 'Q2');
    }
  };

  // Handle Q type change -> update Date automatically
  const handleQuincenaTypeChange = (newQ: 'Q1' | 'Q2') => {
    setQuincenaType(newQ);
    
    // Logic: Shift date by +/- 15 days to land in the other quincena
    const d = new Date(date + 'T00:00:00');
    const day = d.getDate();
    
    // Create new date object
    const newDateObj = new Date(d);

    if (newQ === 'Q1' && day > 15) {
      // Move to Q1 (subtract 15 days roughly, or set to same day index if possible)
      // Simple logic: subtract 15 days
      newDateObj.setDate(day - 15);
    } else if (newQ === 'Q2' && day <= 15) {
      // Move to Q2 (add 15 days)
      newDateObj.setDate(day + 15);
    }
    
    // Check if we accidentally jumped month (e.g. Feb 16 + 15 = Mar 3)
    // If we changed month, clamp to end of original month
    if (newDateObj.getMonth() !== d.getMonth()) {
       newDateObj.setDate(0); // Last day of previous month (which is the intended month)
    }

    setDate(newDateObj.toISOString().split('T')[0]);
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
      color: randomColor
    };
    
    onAddCategory(newCat);
    setCategoryId(newId);
    setIsCreatingCategory(false);
    setNewCategoryName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !accountId) return;

    const transaction: Transaction = {
      id: initialData ? initialData.id : generateId(),
      amount: parseFloat(amount),
      type,
      date,
      categoryId,
      accountId,
      note,
      isRecurring,
      recurrenceRuleId: initialData?.recurrenceRuleId // Keep link if simple edit, logic in parent handles breaking it
    };

    onSave(transaction, {
      createRule: isRecurring && !initialData, // Only create rule if new
      frequency,
      quincenaN: frequency === 'BIWEEKLY' ? quincenaType : undefined,
      updateFuture // Valid if editing an existing recurring transaction
    });
    
    onClose();
  };

  if (!isOpen) return null;

  const currentTypeCategories = categories.filter(c => c.type === type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            {initialData ? 'Editar Transacción' : 'Nueva Transacción'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
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
              onClick={() => setType(TransactionType.INCOME)}
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
              onClick={() => setType(TransactionType.EXPENSE)}
            >
              Gasto
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">Monto</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">$</span>
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
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Fecha</label>
              <input
                type="date"
                required
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                value={date}
                onChange={handleDateChange}
              />
            </div>
             <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Cuenta</label>
              <select
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Section with Quick Add */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Categoría</label>
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
                       {currentTypeCategories.length === 0 ? 'Sin categorías disponibles' : 'Seleccionar...'}
                     </option>
                    {currentTypeCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {/* Chevron Icon for select */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <Tag size={16} />
                  </div>
                  
                  {currentTypeCategories.length === 0 && (
                    <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded flex items-start gap-2">
                      <AlertCircle size={14} className="mt-0.5" />
                      <p>No tienes categorías de {type === TransactionType.INCOME ? 'Ingreso' : 'Gasto'}. Crea una arriba.</p>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nota (Opcional)</label>
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
          
          {/* Recurring Section */}
          <div className="space-y-3">
             {/* If NEW or Not Recurring: Simple Toggle */}
             {(!initialData || !initialData.isRecurring) && (
               <div className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isRecurring ? 'bg-primary-100 text-primary-600' : 'bg-slate-200 text-slate-500'}`}>
                        <Repeat size={18} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Pago Recurrente</p>
                        <p className="text-xs text-slate-500">Se agregará automáticamente en el futuro.</p>
                    </div>
                    <input 
                        type="checkbox" 
                        checked={isRecurring} 
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                    />
                  </div>

                  {isRecurring && (
                    <div className="mt-3 pl-12 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Frecuencia</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFrequency('BIWEEKLY')}
                            className={`px-3 py-1.5 text-xs rounded border transition-colors ${frequency === 'BIWEEKLY' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`}
                          >
                            Quincenal
                          </button>
                          <button
                            type="button"
                            onClick={() => setFrequency('MONTHLY')}
                            className={`px-3 py-1.5 text-xs rounded border transition-colors ${frequency === 'MONTHLY' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`}
                          >
                            Mensual
                          </button>
                        </div>
                      </div>

                      {/* Explicit Quincena Selection */}
                      {frequency === 'BIWEEKLY' && (
                        <div className="bg-primary-50 dark:bg-primary-900/20 p-2 rounded-md border border-primary-100 dark:border-primary-800/30">
                          <label className="block text-xs font-medium text-primary-700 dark:text-primary-300 mb-1">¿En qué quincena?</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="quincenaN"
                                checked={quincenaType === 'Q1'} 
                                onChange={() => handleQuincenaTypeChange('Q1')}
                                className="text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-xs text-slate-700 dark:text-slate-300">1ª (Días 1-15)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="quincenaN"
                                checked={quincenaType === 'Q2'} 
                                onChange={() => handleQuincenaTypeChange('Q2')}
                                className="text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-xs text-slate-700 dark:text-slate-300">2ª (Días 16+)</span>
                            </label>
                          </div>
                          <p className="text-[10px] text-primary-600/70 mt-1">
                            * La fecha se ajustará para coincidir con la quincena.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
               </div>
             )}

             {/* If EDITING a Recurring Transaction: Complex Options */}
             {initialData && initialData.isRecurring && initialData.recurrenceRuleId && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30">
                   <div className="flex items-start gap-3">
                      <CalendarClock className="text-amber-600 mt-1" size={18}/>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Es una transacción recurrente</p>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input 
                              type="radio" 
                              name="editMode"
                              checked={!updateFuture} 
                              onChange={() => setUpdateFuture(false)}
                              className="text-amber-600 focus:ring-amber-500"
                           />
                           <span className="text-sm text-slate-700 dark:text-slate-300">Editar solo esta (Instancia única)</span>
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
                             <p className="text-[10px] text-slate-500 block">No afecta meses anteriores (Crea nueva regla).</p>
                           </div>
                        </label>
                        
                        {updateFuture && (
                          <div className="mt-2 ml-6 space-y-2">
                            <div>
                              <span className="text-xs text-slate-500 mr-2">Frecuencia:</span>
                              <select 
                                value={frequency} 
                                onChange={(e) => setFrequency(e.target.value as Frequency)}
                                className="text-xs p-1 rounded bg-white dark:bg-slate-800 border"
                              >
                                <option value="MONTHLY">Mensual</option>
                                <option value="BIWEEKLY">Quincenal</option>
                              </select>
                            </div>
                            
                            {/* Edit Future: Allow changing Quincena type */}
                            {frequency === 'BIWEEKLY' && (
                              <div className="flex gap-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleQuincenaTypeChange('Q1')}
                                  className={`px-2 py-1 rounded border ${quincenaType === 'Q1' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-700'}`}
                                >
                                  1ª Quincena
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuincenaTypeChange('Q2')}
                                  className={`px-2 py-1 rounded border ${quincenaType === 'Q2' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-700'}`}
                                >
                                  2ª Quincena
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                   </div>
                </div>
             )}
          </div>

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
import React, { useState, useEffect, useMemo } from 'react';
import {
  Transaction, Category, Account, ViewState, DateFilter,
  PeriodType, TransactionType, RecurrenceRule, Frequency
} from './types';
import { generateId, filterTransactions, generateMissingRecurringTransactions } from './utils';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import CategorySettings from './components/CategorySettings';
import PlanningDocs from './components/PlanningDocs';
import FloatingCalculator from './components/FloatingCalculator';
import {
  LayoutDashboard, List, Plus, Settings, Moon, Sun,
  ChevronLeft, ChevronRight, FileText
} from 'lucide-react';
import ConfirmationModal from './components/ConfirmationModal';
import RecurringDeleteModal from './components/RecurringDeleteModal';

// Default Accounts (You can keep these or make them empty too if you wish)
const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'a1', name: 'Efectivo', type: 'CASH', balance: 0 },
  { id: 'a2', name: 'Nómina', type: 'BANK', balance: 0 },
];

const STORAGE_KEYS = {
  TRANSACTIONS: 'finanzaFlow_transactions',
  CATEGORIES: 'finanzaFlow_categories',
  RULES: 'finanzaFlow_rules',
  RECURRENCE_EXCEPTIONS: 'finanzaFlow_recurrenceExceptions',
  ACCOUNTS: 'finanzaFlow_accounts',
  DARK_MODE: 'finanzaFlow_darkMode',
  VIEW: 'finanzaFlow_view',
  DATE_FILTER: 'finanzaFlow_dateFilter',
} as const;

type RecurrenceException = { ruleId: string; date: string };

const isBrowser = typeof window !== 'undefined';

const readStorage = <T,>(key: string): T | null => {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[FinanzaFlow] No se pudo leer "${key}" desde localStorage.`, error);
    return null;
  }
};

const writeStorage = (key: string, value: unknown) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[FinanzaFlow] No se pudo guardar "${key}" en localStorage.`, error);
  }
};

const sanitizeDateFilter = (value: unknown, fallback: DateFilter): DateFilter => {
  if (!value || typeof value !== 'object') return fallback;
  const candidate = value as Partial<DateFilter>;

  const month = typeof candidate.month === 'number' && candidate.month >= 0 && candidate.month <= 11
    ? candidate.month
    : fallback.month;
  const year = typeof candidate.year === 'number' && candidate.year > 1900
    ? candidate.year
    : fallback.year;
  const validPeriods: DateFilter['period'][] = ['ALL', PeriodType.Q1, PeriodType.Q2, PeriodType.MONTH];
  const period = candidate.period && validPeriods.includes(candidate.period)
    ? candidate.period
    : fallback.period;

  return { month, year, period };
};

const getInitialDateFilter = (): DateFilter => {
  const now = new Date();
  const fallback: DateFilter = {
    month: now.getMonth(),
    year: now.getFullYear(),
    period: 'ALL',
  };

  const stored = readStorage<DateFilter>(STORAGE_KEYS.DATE_FILTER);
  return sanitizeDateFilter(stored, fallback);
};

const getInitialView = (): ViewState => {
  const validViews: ViewState[] = ['DASHBOARD', 'TRANSACTIONS', 'PLANNING', 'SETTINGS'];
  const stored = readStorage<ViewState>(STORAGE_KEYS.VIEW);
  if (stored && validViews.includes(stored)) {
    return stored;
  }
  return 'DASHBOARD';
};

const getInitialDarkMode = (): boolean => {
  const stored = readStorage<boolean>(STORAGE_KEYS.DARK_MODE) ?? false;
  if (stored && isBrowser) {
    document.documentElement.classList.add('dark');
  }
  return stored;
};

const App: React.FC = () => {
  // State
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    readStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS) ?? []
  );
  // Initialize categories as empty array. User must add them manually.
  const [categories, setCategories] = useState<Category[]>(() =>
    readStorage<Category[]>(STORAGE_KEYS.CATEGORIES) ?? []
  );
  const [accounts, setAccounts] = useState<Account[]>(() =>
    readStorage<Account[]>(STORAGE_KEYS.ACCOUNTS) ?? DEFAULT_ACCOUNTS
  );
  const [recurrenceRules, setRecurrenceRules] = useState<RecurrenceRule[]>(() =>
    readStorage<RecurrenceRule[]>(STORAGE_KEYS.RULES) ?? []
  );
  const [recurrenceExceptions, setRecurrenceExceptions] = useState<RecurrenceException[]>(() =>
    readStorage<RecurrenceException[]>(STORAGE_KEYS.RECURRENCE_EXCEPTIONS) ?? []
  );

  const [view, setView] = useState<ViewState>(getInitialView);
  const [darkMode, setDarkMode] = useState<boolean>(getInitialDarkMode);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Modal States
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isDestructive: false
  });

  const [recurringDeleteTarget, setRecurringDeleteTarget] = useState<Transaction | null>(null);

  // Date Filtering State
  const [dateFilter, setDateFilter] = useState<DateFilter>(getInitialDateFilter);

  // Save to LocalStorage
  useEffect(() => {
    writeStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
  }, [transactions]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.CATEGORIES, categories);
  }, [categories]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.RULES, recurrenceRules);
  }, [recurrenceRules]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.RECURRENCE_EXCEPTIONS, recurrenceExceptions);
  }, [recurrenceExceptions]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.ACCOUNTS, accounts);
  }, [accounts]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.VIEW, view);
  }, [view]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.DATE_FILTER, dateFilter);
  }, [dateFilter]);

  useEffect(() => {
    if (!isBrowser) return;

    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    writeStorage(STORAGE_KEYS.DARK_MODE, darkMode);
  }, [darkMode]);

  // --- RECURRENCE LOGIC ---

  // Effect: Whenever month changes or rules change, generate missing transactions for current view
  useEffect(() => {
    if (recurrenceRules.length > 0) {
      const generated = generateMissingRecurringTransactions(
        recurrenceRules,
        transactions,
        dateFilter.month,
        dateFilter.year,
        recurrenceExceptions
      );

      if (generated.length > 0) {
        setTransactions(prev => [...prev, ...generated]);
        // console.log("Generated recurring transactions:", generated.length);
      }
    }
  }, [dateFilter.month, dateFilter.year, recurrenceRules, recurrenceExceptions]); // Deliberately exclude 'transactions' to avoid loop, we check existence inside 'generate' function

  // Derived Data
  const filteredTransactions = useMemo(() =>
    filterTransactions(transactions, dateFilter.month, dateFilter.year, dateFilter.period),
    [transactions, dateFilter]);

  // Actions

  const handleEditClick = (t: Transaction) => {
    console.log('handleEditClick called with:', t);
    setEditingTransaction(t);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = (
    t: Transaction,
    options?: {
      createRule: boolean,
      frequency: Frequency,
      quincenaN?: 'Q1' | 'Q2',
      updateFuture: boolean
    }
  ) => {
    try {
      let newTransactions = [...transactions];
      let newRules = [...recurrenceRules];

      if (options?.createRule) {
        const ruleId = generateId();
        const newRule: RecurrenceRule = {
          id: ruleId,
          frequency: options.frequency,
          quincenaN: options.quincenaN,
          startDate: t.date,
          amount: t.amount,
          type: t.type,
          categoryId: t.categoryId,
          accountId: t.accountId,
          note: t.note || '',
          baseDateDay: new Date(t.date + 'T00:00:00').getDate()
        };

        newRules.push(newRule);

        const txWithRule: Transaction = {
          ...t,
          id: editingTransaction ? editingTransaction.id : generateId(),
          isRecurring: true,
          recurrenceRuleId: ruleId
        };

        if (editingTransaction) {
          newTransactions = newTransactions.map(item =>
            item.id === editingTransaction.id ? txWithRule : item
          );
        } else {
          newTransactions = [...newTransactions, txWithRule];
        }
      } else if (editingTransaction) {
        if (options?.updateFuture && editingTransaction.recurrenceRuleId) {
          const oldRuleIndex = newRules.findIndex(r => r.id === editingTransaction.recurrenceRuleId);

          if (oldRuleIndex >= 0) {
            const editedDate = new Date(t.date + 'T00:00:00');
            const prevDay = new Date(editedDate);
            prevDay.setDate(prevDay.getDate() - 1);

            newRules[oldRuleIndex] = {
              ...newRules[oldRuleIndex],
              endDate: prevDay.toISOString().split('T')[0]
            };

            const newRuleId = generateId();
            const newRule: RecurrenceRule = {
              id: newRuleId,
              frequency: options.frequency,
              quincenaN: options.quincenaN,
              startDate: t.date,
              amount: t.amount,
              type: t.type,
              categoryId: t.categoryId,
              accountId: t.accountId,
              note: t.note || '',
              baseDateDay: new Date(t.date + 'T00:00:00').getDate()
            };
            newRules.push(newRule);

            const updatedTx: Transaction = {
              ...t,
              id: editingTransaction.id,
              isRecurring: true,
              recurrenceRuleId: newRuleId
            };

            newTransactions = newTransactions.map(item =>
              item.id === editingTransaction.id ? updatedTx : item
            );
          }
        } else {
          if (editingTransaction.isRecurring) {
            const detachedTx: Transaction = {
              ...t,
              id: generateId(),
              isRecurring: false,
              recurrenceRuleId: undefined
            };
            newTransactions = [...newTransactions, detachedTx];
          } else {
            const updatedTx: Transaction = {
              ...t,
              id: editingTransaction.id
            };
            newTransactions = newTransactions.map(item =>
              item.id === editingTransaction.id ? updatedTx : item
            );
          }
        }
      } else {
        newTransactions = [...newTransactions, { ...t, id: generateId() }];
      }

      setRecurrenceRules(newRules);
      setTransactions(newTransactions);
      setEditingTransaction(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error al guardar la transacción:', error);
      alert('Hubo un error al guardar la transacción. Por favor, inténtalo de nuevo.');
    }
  };

  const performDeleteInstance = (tx: Transaction) => {
    if (!tx || !tx.recurrenceRuleId) return;

    setRecurrenceExceptions(prev => {
      if (prev.some(e => e.ruleId === tx.recurrenceRuleId && e.date === tx.date)) return prev;
      return [...prev, { ruleId: tx.recurrenceRuleId!, date: tx.date }];
    });
    setTransactions(prev => prev.filter(t => t.id !== tx.id));
    setRecurringDeleteTarget(null);
  };

  const performDeleteSeries = (tx: Transaction) => {
    if (!tx || !tx.recurrenceRuleId) return;

    setRecurrenceRules(prev => prev.filter(r => r.id !== tx.recurrenceRuleId));
    setRecurrenceExceptions(prev => prev.filter(e => e.ruleId !== tx.recurrenceRuleId));
    setTransactions(prev => prev.filter(t => t.recurrenceRuleId !== tx.recurrenceRuleId));
    setRecurringDeleteTarget(null);
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    if (tx.isRecurring && tx.recurrenceRuleId) {
      setRecurringDeleteTarget(tx);
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Transacción',
      message: '¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.',
      isDestructive: true,
      onConfirm: () => {
        setTransactions(prev => prev.filter(t => t.id !== id));
      }
    });
  };

  const handleAddCategory = (category: Category) => {
    setCategories(prev => [...prev, category]);
  };

  const handleDeleteCategory = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Categoría',
      message: '¿Seguro que deseas eliminar esta categoría? Si hay transacciones asociadas, aparecerán como "Sin Categoría".',
      isDestructive: true,
      onConfirm: () => {
        setCategories(prev => prev.filter(c => c.id !== id));
      }
    });
  };

  const changeMonth = (delta: number) => {
    let newMonth = dateFilter.month + delta;
    let newYear = dateFilter.year;

    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    setDateFilter(prev => ({ ...prev, month: newMonth, year: newYear }));
  };

  const monthName = new Date(dateFilter.year, dateFilter.month).toLocaleString('es-MX', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">

      {/* Top Navigation Bar */}
      <header className="fixed top-0 w-full z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
              F
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">FinanzaFlow</span>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md">
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-sm font-medium capitalize w-32 text-center select-none">{monthName}</span>
            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md">
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 pt-24 pb-24">

        {/* Period Filter Tabs */}
        {(view === 'DASHBOARD' || view === 'TRANSACTIONS') && (
          <div className="flex justify-center mb-8">
            <div className="bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 inline-flex">
              <button
                onClick={() => setDateFilter(prev => ({ ...prev, period: PeriodType.Q1 }))}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${dateFilter.period === PeriodType.Q1 ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                1ª Quincena
              </button>
              <button
                onClick={() => setDateFilter(prev => ({ ...prev, period: PeriodType.Q2 }))}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${dateFilter.period === PeriodType.Q2 ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                2ª Quincena
              </button>
              <button
                onClick={() => setDateFilter(prev => ({ ...prev, period: 'ALL' }))}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${dateFilter.period === 'ALL' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Mes Completo
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Views */}
        {view === 'DASHBOARD' && (
          <>
            <Dashboard
              transactions={filteredTransactions}
              categories={categories}
              filter={dateFilter}
              onEdit={handleEditClick}
              onDelete={handleDeleteTransaction}
            />
          </>
        )}

        {view === 'TRANSACTIONS' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Movimientos</h2>
              <span className="text-sm text-slate-500">{filteredTransactions.length} registros</span>
            </div>
            <TransactionList
              transactions={filteredTransactions}
              categories={categories}
              onEdit={handleEditClick}
              onDelete={handleDeleteTransaction}
            />
          </div>
        )}

        {view === 'PLANNING' && <PlanningDocs />}

        {view === 'SETTINGS' && (
          <div className="animate-fade-in pb-20">
            <CategorySettings
              categories={categories}
              onAdd={handleAddCategory}
              onDelete={handleDeleteCategory}
            />
          </div>
        )}

      </main>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => {
          setEditingTransaction(null);
          setIsModalOpen(true);
        }}
        className="fixed bottom-24 right-6 md:right-12 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg shadow-primary-600/40 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-40"
      >
        <Plus size={28} />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 h-16 pb-safe z-40">
        <div className="grid grid-cols-4 h-full max-w-lg mx-auto">
          <button
            onClick={() => setView('DASHBOARD')}
            className={`flex flex-col items-center justify-center gap-1 ${view === 'DASHBOARD' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-medium">Inicio</span>
          </button>

          <button
            onClick={() => setView('TRANSACTIONS')}
            className={`flex flex-col items-center justify-center gap-1 ${view === 'TRANSACTIONS' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <List size={20} />
            <span className="text-[10px] font-medium">Historial</span>
          </button>

          <button
            onClick={() => setView('PLANNING')}
            className={`flex flex-col items-center justify-center gap-1 ${view === 'PLANNING' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <FileText size={20} />
            <span className="text-[10px] font-medium">Docs</span>
          </button>

          <button
            onClick={() => setView('SETTINGS')}
            className={`flex flex-col items-center justify-center gap-1 ${view === 'SETTINGS' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Settings size={20} />
            <span className="text-[10px] font-medium">Ajustes</span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      <TransactionForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        onAddCategory={handleAddCategory}
        categories={categories}
        accounts={accounts}
        initialData={editingTransaction}
      />
      <FloatingCalculator />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
      />

      <RecurringDeleteModal
        isOpen={!!recurringDeleteTarget}
        onClose={() => setRecurringDeleteTarget(null)}
        onDeleteInstance={() => recurringDeleteTarget && performDeleteInstance(recurringDeleteTarget)}
        onDeleteSeries={() => recurringDeleteTarget && performDeleteSeries(recurringDeleteTarget)}
      />
    </div>
  );
};

export default App;
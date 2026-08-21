import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot,
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where
} from 'firebase/firestore';
import { auth, db } from './firebaseClient';
import {
  Transaction,
  Category,
  Account,
  ViewState,
  DateFilter,
  TransactionType,
  RecurrenceRule,
  Frequency,
  Goal,
  Debt,
  Budget,
  Notification,
} from './types';
import {
  generateId,
  filterTransactions,
  generateMissingRecurringTransactions,
  roundToTwo,
  getCategoryEmojiFromGroq,
  exportTransactionsToCSV,
  calculateAutoSave,
  formatCurrency,
} from './utils';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import CategorySettings from './components/CategorySettings';
import FloatingCalculator from './components/FloatingCalculator';
import { DashboardSkeleton } from './components/Skeleton';
import AuthPage from './components/AuthPage';
import AIAssistantModal from './components/AIAssistantModal';
import type { AIAction } from './components/AIAssistantModal';
import GoalsView from './components/GoalsView';
import DebtsView from './components/DebtsView';
import GoalFormModal from './components/GoalFormModal';
import DebtFormModal from './components/DebtFormModal';
import ExportButton from './components/ExportButton';
import BudgetPanel from './components/BudgetPanel';
import EvolutionChart from './components/EvolutionChart';
import NetWorthChart from './components/NetWorthChart';
import AdvancedFilters, { defaultFilters, type FilterState } from './components/AdvancedFilters';
import NotificationBanner from './components/NotificationBanner';
import {
  LayoutDashboard,
  List,
  Plus,
  Sparkles,
  Settings,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  LogOut,
  AlertCircle,
  CreditCard,
  Trophy,
  TrendingDown,
  Download,
} from 'lucide-react';
import ConfirmationModal from './components/ConfirmationModal';
import CategoryFormModal from './components/CategoryFormModal';
import RecurringDeleteModal from './components/RecurringDeleteModal';

// Default Accounts
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
  GOALS: 'finanzaFlow_goals',
  DEBTS: 'finanzaFlow_debts',
  BUDGETS: 'finanzaFlow_budgets',
  NOTIFICATIONS: 'finanzaFlow_notifications',
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

const getInitialDateFilter = (): DateFilter => {
  const now = new Date();
  return {
    month: now.getMonth(),
    year: now.getFullYear(),
  };
};

const getInitialView = (): ViewState => {
  const validViews: ViewState[] = ['DASHBOARD', 'TRANSACTIONS', 'SETTINGS', 'GOALS', 'DEBTS'];
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
  // Auth State
  const [session, setSession] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);

  // Listen for auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.warn('[FinanzaFlow] Auth State Change:', user ? 'Logged In' : 'Logged Out');
      setSession(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    console.warn('[FinanzaFlow] Cerrando sesión...');
    try {
      await signOut(auth);
    } catch (err) {
      console.error('[FinanzaFlow] Error al cerrar sesión:', err);
    }

    if (isBrowser) {
      Object.keys(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(STORAGE_KEYS[key as keyof typeof STORAGE_KEYS]);
      });
    }

    setSession(null);
    setTransactions([]);
    setCategories([]);
    setAccounts(DEFAULT_ACCOUNTS);
    setRecurrenceRules([]);
    setRecurrenceExceptions([]);
    setIsLoading(false);

    if (isBrowser) window.location.reload();
  };

  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS);
  const [recurrenceRules, setRecurrenceRules] = useState<RecurrenceRule[]>([]);
  const [recurrenceExceptions, setRecurrenceExceptions] = useState<RecurrenceException[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const [view, setView] = useState<ViewState>(getInitialView);
  const [darkMode, setDarkMode] = useState<boolean>(getInitialDarkMode);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [defaultFormType, setDefaultFormType] = useState<TransactionType>(TransactionType.EXPENSE);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false,
  });

  const [recurringDeleteTarget, setRecurringDeleteTarget] = useState<Transaction | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>(getInitialDateFilter);

  // Goals & Debts State (Firestore es la única fuente de verdad; sin seed local)
  const [goals, setGoals] = useState<Goal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [isSyncingEmojis, setIsSyncingEmojis] = useState(false);

  // Budgets State
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Advanced Filters
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>(defaultFilters);

  // --- REAL-TIME SYNC (Firestore onSnapshot) ---
  // Firestore es la ÚNICA fuente de verdad. Sin migración local ni fallback a localStorage:
  // lo que se elimina en un dispositivo desaparece en todos, al instante.
  useEffect(() => {
    if (!session) return;
    setIsLoading(true);
    setInitError(null);

    let pending = 8;
    const settle = () => {
      pending -= 1;
      if (pending <= 0) setIsLoading(false);
    };
    const handleError = (label: string, err: unknown) => {
      console.error(`[FinanzaFlow] Error escuchando "${label}":`, err);
      setInitError((prev) => prev ?? (err instanceof Error ? err.message : 'Error de sincronización'));
      settle();
    };

    const uid = session.uid;

    const unsubs = [
      onSnapshot(
        query(collection(db, 'categories'), where('user_id', '==', uid)),
        (snap) => {
          setCategories(snap.docs.map((d) => {
            const data = d.data();
            return { id: d.id, name: data.name, type: data.type, color: data.color, icon: data.icon };
          }));
          settle();
        },
        (err) => handleError('categories', err)
      ),

      onSnapshot(
        query(collection(db, 'recurrence_rules'), where('user_id', '==', uid)),
        (snap) => {
          setRecurrenceRules(snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              frequency: data.frequency,
              startDate: data.start_date,
              endDate: data.end_date,
              amount: data.amount,
              type: data.type,
              categoryId: data.category_id,
              accountId: data.account_id,
              note: data.note,
              baseDateDay: data.base_date_day,
            };
          }));
          settle();
        },
        (err) => handleError('recurrence_rules', err)
      ),

      onSnapshot(
        query(collection(db, 'transactions'), where('user_id', '==', uid)),
        (snap) => {
          setTransactions(snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              amount: data.amount,
              type: data.type,
              date: data.date,
              categoryId: data.category_id,
              accountId: data.account_id,
              note: data.note,
              isRecurring: data.is_recurring,
              recurrenceRuleId: data.recurrence_rule_id,
              linkedGoalId: data.linked_goal_id,
              linkedDebtId: data.linked_debt_id,
            };
          }));
          settle();
        },
        (err) => handleError('transactions', err)
      ),

      onSnapshot(
        query(collection(db, 'accounts'), where('user_id', '==', uid)),
        (snap) => {
          const mappedAccounts: Account[] = snap.docs.map((d) => {
            const data = d.data();
            return { id: d.id, name: data.name, type: data.type, balance: data.balance };
          });
          // Seed idempotente para usuarios nuevos: IDs deterministas (a1/a2),
          // dos dispositivos pueden sembrar a la vez sin duplicar documentos.
          if (mappedAccounts.length === 0) {
            setAccounts(DEFAULT_ACCOUNTS);
            DEFAULT_ACCOUNTS.forEach((a) => {
              setDoc(doc(db, 'accounts', a.id), { ...a, user_id: uid }).catch(() => {});
            });
          } else {
            setAccounts(mappedAccounts);
          }
          settle();
        },
        (err) => handleError('accounts', err)
      ),

      onSnapshot(
        query(collection(db, 'goals'), where('user_id', '==', uid)),
        (snap) => {
          setGoals(snap.docs.map((d) => {
            const data = d.data();
            return { id: d.id, name: data.name, targetAmount: data.targetAmount, currentAmount: data.currentAmount, targetDate: data.targetDate, color: data.color, icon: data.icon, createdAt: data.createdAt };
          }));
          settle();
        },
        (err) => handleError('goals', err)
      ),

      onSnapshot(
        query(collection(db, 'debts'), where('user_id', '==', uid)),
        (snap) => {
          setDebts(snap.docs.map((d) => {
            const data = d.data();
            return { id: d.id, name: data.name, totalAmount: data.totalAmount, paidAmount: data.paidAmount, dueDate: data.dueDate, notes: data.notes, color: data.color, createdAt: data.createdAt };
          }));
          settle();
        },
        (err) => handleError('debts', err)
      ),

      onSnapshot(
        query(collection(db, 'recurrence_exceptions'), where('user_id', '==', uid)),
        (snap) => {
          setRecurrenceExceptions(snap.docs.map((d) => {
            const data = d.data();
            return { ruleId: data.ruleId, date: data.date };
          }));
          settle();
        },
        (err) => handleError('recurrence_exceptions', err)
      ),

      onSnapshot(
        query(collection(db, 'budgets'), where('user_id', '==', uid)),
        (snap) => {
          setBudgets(snap.docs.map((d) => {
            const data = d.data();
            return { id: d.id, categoryId: data.categoryId, amount: data.amount, month: data.month, year: data.year };
          }));
          settle();
        },
        (err) => handleError('budgets', err)
      ),
    ];

    return () => unsubs.forEach((u) => u());
  }, [session]);

  // --- PERSISTENCE: Save to LocalStorage ---
  useEffect(() => {
    if (!isLoading) writeStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
  }, [transactions, isLoading]);

  useEffect(() => {
    if (!isLoading) writeStorage(STORAGE_KEYS.CATEGORIES, categories);
  }, [categories, isLoading]);

  useEffect(() => {
    if (!isLoading) writeStorage(STORAGE_KEYS.RULES, recurrenceRules);
  }, [recurrenceRules, isLoading]);

  useEffect(() => {
    if (!isLoading) writeStorage(STORAGE_KEYS.RECURRENCE_EXCEPTIONS, recurrenceExceptions);
  }, [recurrenceExceptions, isLoading]);

  useEffect(() => {
    if (!isLoading) writeStorage(STORAGE_KEYS.ACCOUNTS, accounts);
  }, [accounts, isLoading]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.VIEW, view);
  }, [view]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.GOALS, goals);
  }, [goals]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.DEBTS, debts);
  }, [debts]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.BUDGETS, budgets);
  }, [budgets]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
  }, [notifications]);

  useEffect(() => {
    if (!isBrowser) return;
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    writeStorage(STORAGE_KEYS.DARK_MODE, darkMode);
  }, [darkMode]);

  // Keep a stable ref of current transactions to avoid re-triggering the recurrence effect on every transaction change
  const transactionsRef = useRef<Transaction[]>(transactions);
  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  const exceptionsRef = useRef<RecurrenceException[]>(recurrenceExceptions);
  useEffect(() => {
    exceptionsRef.current = recurrenceExceptions;
  }, [recurrenceExceptions]);

  // --- RECURRENCE LOGIC ---
  // NOTE: We intentionally do NOT include `transactions` or `recurrenceExceptions` as dependencies here.
  // Using refs instead prevents the infinite loop: generate tx -> tx changes -> generate again -> ...
  // This effect only re-runs when the month/year changes or the rules themselves change.
  useEffect(() => {
    if (recurrenceRules.length > 0 && session) {
      const generated = generateMissingRecurringTransactions(
        recurrenceRules,
        transactionsRef.current,
        dateFilter.month,
        dateFilter.year,
        exceptionsRef.current
      );

      if (generated.length > 0) {
        setTransactions((prev) => [...prev, ...generated]);

        const syncGenerated = async () => {
          for (const tx of generated) {
            await setDoc(doc(db, 'transactions', tx.id), {
              amount: tx.amount,
              type: tx.type,
              date: tx.date,
              category_id: tx.categoryId,
              account_id: tx.accountId,
              note: tx.note,
              is_recurring: tx.isRecurring,
              recurrence_rule_id: tx.recurrenceRuleId,
              user_id: session.uid
            });
          }
        };
        syncGenerated();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter.month, dateFilter.year, recurrenceRules, session]);

  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, dateFilter.month, dateFilter.year),
    [transactions, dateFilter]
  );

  // Saldo de cada cuenta DERIVADO de todas las transacciones (verdad del servidor).
  // Reemplaza el campo `balance` escrito desde arrays locales (fuente de corrupción).
  const derivedAccounts = useMemo(() => {
    const balances: Record<string, number> = {};
    transactions.forEach((t) => {
      balances[t.accountId] = (balances[t.accountId] || 0) + (t.type === 'INCOME' ? t.amount : -t.amount);
    });
    return accounts.map((a) => ({ ...a, balance: roundToTwo(balances[a.id] || 0) }));
  }, [accounts, transactions]);

  const handleEditClick = (t: Transaction) => {
    setEditingTransaction(t);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (
    t: Transaction,
    options?: {
      createRule: boolean;
      frequency: Frequency;
      updateFuture: boolean;
    }
  ) => {
    if (!session) return;
    try {
      let newTransactions = [...transactions];
      const newRules = [...recurrenceRules];
      const transactionsToSync: Transaction[] = [];
      const rulesToSync: RecurrenceRule[] = [];

      if (options?.createRule) {
        const ruleId = generateId();
        const newRule: RecurrenceRule = {
          id: ruleId,
          frequency: options.frequency,
          startDate: t.date,
          amount: t.amount,
          type: t.type,
          categoryId: t.categoryId,
          accountId: t.accountId,
          note: t.note || '',
          baseDateDay: new Date(t.date + 'T00:00:00').getDate(),
        };
        newRules.push(newRule);
        rulesToSync.push(newRule);

        const txWithRule: Transaction = {
          ...t,
          id: editingTransaction ? editingTransaction.id : generateId(),
          isRecurring: true,
          recurrenceRuleId: ruleId,
        };

        if (editingTransaction) {
          newTransactions = newTransactions.map((item) =>
            item.id === editingTransaction.id ? txWithRule : item
          );
        } else {
          newTransactions = [...newTransactions, txWithRule];
        }
        transactionsToSync.push(txWithRule);
      } else if (editingTransaction) {
        if (options?.updateFuture && editingTransaction.recurrenceRuleId) {
          const oldRuleIndex = newRules.findIndex((r) => r.id === editingTransaction.recurrenceRuleId);
          if (oldRuleIndex >= 0) {
            const editedDate = new Date(t.date + 'T00:00:00');
            const prevDay = new Date(editedDate);
            prevDay.setDate(prevDay.getDate() - 1);

            const updatedOldRule = {
              ...newRules[oldRuleIndex],
              endDate: prevDay.toISOString().split('T')[0],
            };
            newRules[oldRuleIndex] = updatedOldRule;
            rulesToSync.push(updatedOldRule);

            const newRuleId = generateId();
            const newRule: RecurrenceRule = {
              id: newRuleId,
              frequency: options.frequency,
              startDate: t.date,
              amount: t.amount,
              type: t.type,
              categoryId: t.categoryId,
              accountId: t.accountId,
              note: t.note || '',
              baseDateDay: new Date(t.date + 'T00:00:00').getDate(),
            };
            newRules.push(newRule);
            rulesToSync.push(newRule);

            const updatedTx: Transaction = {
              ...t,
              id: editingTransaction.id,
              isRecurring: true,
              recurrenceRuleId: newRuleId,
            };

            newTransactions = newTransactions.map((item) =>
              item.id === editingTransaction.id ? updatedTx : item
            );
            transactionsToSync.push(updatedTx);
          }
        } else {
          if (editingTransaction.isRecurring && editingTransaction.recurrenceRuleId) {
            const ruleId = editingTransaction.recurrenceRuleId;
            const oldDate = editingTransaction.date;
            newTransactions = newTransactions.map((item) =>
              item.id === editingTransaction.id
                ? { ...t, id: editingTransaction.id, isRecurring: false, recurrenceRuleId: undefined }
                : item
            );
            transactionsToSync.push({
              ...t,
              id: editingTransaction.id,
              isRecurring: false,
              recurrenceRuleId: undefined,
            });
            // Add exception to prevent rule from re-generating this exact date
            setRecurrenceExceptions((prev) => {
              const next = [...prev, { ruleId, date: oldDate }];
              writeStorage(STORAGE_KEYS.RECURRENCE_EXCEPTIONS, next);
              // Also persist exception to Firestore
              const exId = `${ruleId}_${oldDate}`;
              setDoc(doc(db, 'recurrence_exceptions', exId), {
                ruleId,
                date: oldDate,
                user_id: session!.uid,
              }).catch(() => {});
              return next;
            });
          } else {
            const updatedTx: Transaction = { ...t, id: editingTransaction.id };
            newTransactions = newTransactions.map((item) => item.id === editingTransaction.id ? updatedTx : item);
            transactionsToSync.push(updatedTx);
          }
        }
      } else {
        const newTx = { ...t, id: generateId() };
        newTransactions = [...newTransactions, newTx];
        transactionsToSync.push(newTx);
      }

      // --- FIRESTORE SYNC (FIRST) ---
      for (const rule of rulesToSync) {
        await setDoc(doc(db, 'recurrence_rules', rule.id), {
          frequency: rule.frequency,
          start_date: rule.startDate,
          end_date: rule.endDate || null,
          amount: rule.amount,
          type: rule.type,
          category_id: rule.categoryId,
          account_id: rule.accountId,
          note: rule.note,
          base_date_day: rule.baseDateDay,
          user_id: session.uid
        });
      }

      for (const tx of transactionsToSync) {
        await setDoc(doc(db, 'transactions', tx.id), {
          amount: tx.amount,
          type: tx.type,
          date: tx.date,
          category_id: tx.categoryId,
          account_id: tx.accountId,
          note: tx.note,
          is_recurring: tx.isRecurring,
          recurrence_rule_id: tx.recurrenceRuleId || null,
          linked_goal_id: tx.linkedGoalId || null,
          linked_debt_id: tx.linkedDebtId || null,
          user_id: session.uid
        });
      }

      // NOTA: el saldo de cuentas ya NO se escribe aquí. Se DERIVA de las
      // transacciones (fuente fresca del servidor) en `derivedAccounts`.
      // Escribirlo desde arrays locales causaba saldos corruptos entre dispositivos.

      // STATE UPDATE (AFTER Firestore succeeds)
      setRecurrenceRules(newRules);
      setTransactions(newTransactions);

      // FETCH EMOJI FROM GROQ IF CATEGORY HAS NO ICON
      const firstTx = transactionsToSync[0];
      if (firstTx) {
        const cat = categories.find((c) => c.id === firstTx.categoryId);
        if (cat && (!cat.icon || cat.icon === '📌' || cat.icon === 'Tag' || cat.icon.length === 1)) {
          const emoji = await getCategoryEmojiFromGroq(cat.name);
          if (emoji && emoji !== '📌') {
            setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, icon: emoji } : c)));
            await updateDoc(doc(db, 'categories', cat.id), { icon: emoji });
          }
        }
      }
    } catch (error: any) {
      console.error('Error al guardar:', error);
      alert('Error al guardar en Firebase. Revisa tu conexión e intenta de nuevo.');
      return;
    } finally {
      setEditingTransaction(null);
      setIsModalOpen(false);
    }
  };

  const performDeleteInstance = async (tx: Transaction) => {
    if (!tx || !tx.recurrenceRuleId || !session) return;

    // Save exception to Firestore first (so it persists across cache clears)
    const exId = `${tx.recurrenceRuleId}_${tx.date}`;
    await setDoc(doc(db, 'recurrence_exceptions', exId), {
      ruleId: tx.recurrenceRuleId,
      date: tx.date,
      user_id: session.uid,
    });

    setRecurrenceExceptions((prev) => [...prev, { ruleId: tx.recurrenceRuleId!, date: tx.date }]);
    const updatedTransactions = transactions.filter((t) => t.id !== tx.id);
    setTransactions(updatedTransactions);
    setRecurringDeleteTarget(null);

    await deleteDoc(doc(db, 'transactions', tx.id));
  };

  const performDeleteSeries = async (tx: Transaction) => {
    if (!tx || !tx.recurrenceRuleId || !session) return;
    setRecurrenceRules((prev) => prev.filter((r) => r.id !== tx.recurrenceRuleId));
    const updatedTransactions = transactions.filter((t) => t.recurrenceRuleId !== tx.recurrenceRuleId);
    setTransactions(updatedTransactions);
    setRecurringDeleteTarget(null);

    // Delete all instances and the rule in Firestore (Ideally with batch)
    const txsToDelete = transactions.filter(t => t.recurrenceRuleId === tx.recurrenceRuleId);
    for (const t of txsToDelete) {
      await deleteDoc(doc(db, 'transactions', t.id));
    }
    await deleteDoc(doc(db, 'recurrence_rules', tx.recurrenceRuleId));
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;

    if (tx.isRecurring && tx.recurrenceRuleId) {
      setRecurringDeleteTarget(tx);
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Transacción',
      message: '¿Estás seguro?',
      isDestructive: true,
      onConfirm: async () => {
        const updatedTransactions = transactions.filter((t) => t.id !== id);
        setTransactions(updatedTransactions);
        await deleteDoc(doc(db, 'transactions', id));
      },
    });
  };

  // --- GOALS HANDLERS ---
  const handleSaveGoal = async (goal: Goal) => {
    setGoals((prev) => {
      const exists = prev.find((g) => g.id === goal.id);
      if (exists) return prev.map((g) => (g.id === goal.id ? goal : g));
      return [...prev, goal];
    });
    if (session) await setDoc(doc(db, 'goals', goal.id), { ...goal, user_id: session.uid });
  };

  const handleDeleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    if (session) deleteDoc(doc(db, 'goals', id));
  };

  // --- DEBTS HANDLERS ---
  const handleSaveDebt = async (debt: Debt) => {
    setDebts((prev) => {
      const exists = prev.find((d) => d.id === debt.id);
      if (exists) return prev.map((d) => (d.id === debt.id ? debt : d));
      return [...prev, debt];
    });
    if (session) await setDoc(doc(db, 'debts', debt.id), { ...debt, user_id: session.uid });
  };

  const handleDeleteDebt = (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
    if (session) deleteDoc(doc(db, 'debts', id));
  };

  // --- BUDGET HANDLERS ---
  const handleSaveBudget = async (budget: Budget) => {
    setBudgets(prev => {
      const exists = prev.find(b => b.id === budget.id);
      if (exists) return prev.map(b => b.id === budget.id ? budget : b);
      return [...prev, budget];
    });
    if (session) await setDoc(doc(db, 'budgets', budget.id), { ...budget, user_id: session.uid }).catch(() => {});
  };

  const handleDeleteBudget = (id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
    if (session) deleteDoc(doc(db, 'budgets', id)).catch(() => {});
  };

  // --- NOTIFICATION HANDLERS ---
  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n));
  };

  // Check for due dates, budget overruns, etc.
  // Con onSnapshot este efecto corre en cada sincronización: la clave única
  // (`key`) evita crear notificaciones duplicadas de la misma condición.
  useEffect(() => {
    if (!session || debts.length === 0) return;
    const today = new Date();
    const nowIso = () => new Date().toISOString();
    const pending: Notification[] = [];

    debts.forEach(d => {
      if (!d.dueDate) return;
      const linkedPaid = transactions.filter(t => t.linkedDebtId === d.id).reduce((s, t) => s + t.amount, 0);
      const paid = d.paidAmount + linkedPaid;
      const due = new Date(d.dueDate + 'T00:00:00');
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const isPaid = d.totalAmount > 0 && paid >= d.totalAmount;
      if (isPaid) return;

      if (diffDays === 7) {
        pending.push({ id: generateId(), key: `debt-${d.id}-7`, type: 'warning', title: 'Deuda próxima a vencer', message: `${d.name} vence en 7 días (${formatCurrency(Math.max(d.totalAmount - paid, 0))} restantes)`, dismissed: false, createdAt: nowIso() });
      }
      if (diffDays === 3) {
        pending.push({ id: generateId(), key: `debt-${d.id}-3`, type: 'warning', title: 'Deuda por vencer', message: `${d.name} vence en 3 días. ¡No olvides pagar!`, dismissed: false, createdAt: nowIso() });
      }
      if (diffDays === 0) {
        pending.push({ id: generateId(), key: `debt-${d.id}-0`, type: 'error', title: 'Deuda vencida hoy', message: `${d.name} vence hoy.`, dismissed: false, createdAt: nowIso() });
      }
      if (diffDays < 0) {
        pending.push({ id: generateId(), key: `debt-${d.id}-overdue`, type: 'error', title: 'Deuda vencida', message: `${d.name} venció el ${new Date(d.dueDate + 'T00:00:00').toLocaleDateString('es-MX')}.`, dismissed: false, createdAt: nowIso() });
      }
    });

    if (pending.length === 0) return;
    setNotifications(prev => {
      const seen = new Set(prev.map(n => n.key).filter(Boolean));
      const fresh = pending.filter(n => n.key && !seen.has(n.key));
      return fresh.length > 0 ? [...fresh.reverse(), ...prev].slice(0, 20) : prev;
    });
  }, [session, debts, transactions]);

  // --- ADVANCED FILTERING ---
  const applyAdvancedFilters = (txs: Transaction[]): Transaction[] => {
    const f = advancedFilters;
    return txs.filter(t => {
      if (f.search && !t.note?.toLowerCase().includes(f.search.toLowerCase())) return false;
      if (f.type !== 'ALL' && t.type !== f.type) return false;
      if (f.categoryId && t.categoryId !== f.categoryId) return false;
      if (f.dateFrom && t.date < f.dateFrom) return false;
      if (f.dateTo && t.date > f.dateTo) return false;
      if (f.minAmount && t.amount < parseFloat(f.minAmount)) return false;
      if (f.maxAmount && t.amount > parseFloat(f.maxAmount)) return false;
      return true;
    });
  };

  const filteredTransactionsWithAdvanced = useMemo(
    () => applyAdvancedFilters(filterTransactions(transactions, dateFilter.month, dateFilter.year)),
    [transactions, dateFilter, advancedFilters]
  );

  // --- AI EXECUTE ---
  const handleAIExecute = async (actions: AIAction[]) => {
    for (const action of actions) {
      let cat = categories.find((c) => c.name.toLowerCase() === action.categoryName.toLowerCase());
      if (!cat) {
        const newId = generateId();
        cat = { id: newId, name: action.categoryName, type: action.transactionType, color: '#6B7280', icon: '' };
        await handleAddCategory(cat);
      }
      let acc = accounts.find((a) => a.name.toLowerCase() === action.accountName.toLowerCase());
      if (!acc) {
        const newId = generateId();
        acc = { id: newId, name: action.accountName, balance: 0, type: 'CASH', color: '#6B7280' };
        setAccounts((prev) => [...prev, acc]);
        await setDoc(doc(db, 'accounts', newId), { name: acc.name, balance: 0, type: 'CASH', color: acc.color, user_id: session!.uid });
      }
      await handleSaveTransaction({
        id: generateId(),
        amount: action.amount,
        type: action.transactionType,
        date: action.date,
        categoryId: cat.id,
        accountId: acc.id,
        note: action.description,
        isRecurring: action.isRecurring || false,
        recurrenceRuleId: undefined,
      });
    }
  };

  const handleAddCategory = async (category: Category) => {
    if (!session) return;
    let emoji = category.icon;
    if (!emoji || emoji === '📌' || emoji === 'Tag' || emoji.length === 1) {
      emoji = await getCategoryEmojiFromGroq(category.name);
    }
    const catWithEmoji = { ...category, icon: emoji };
    setCategories((prev) => [...prev, catWithEmoji]);
    await setDoc(doc(db, 'categories', catWithEmoji.id), { ...catWithEmoji, user_id: session.uid });
  };

  const handleUpdateCategory = async (category: Category) => {
    if (!session) return;
    setCategories((prev) => prev.map((c) => (c.id === category.id ? category : c)));
    await updateDoc(doc(db, 'categories', category.id), {
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon
    });
  };

  const handleDeleteCategory = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Categoría',
      message: '¿Seguro?',
      isDestructive: true,
      onConfirm: async () => {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        await deleteDoc(doc(db, 'categories', id));
      },
    });
  };

  const handleSyncEmojis = async () => {
    if (!session || !import.meta.env.VITE_GROQ_API_KEY) return;
    setIsSyncingEmojis(true);
    try {
      const updatedCategories = [...categories];
      let madeChanges = false;

      for (let i = 0; i < updatedCategories.length; i++) {
        const cat = updatedCategories[i];
        if (!cat.icon || cat.icon === '📌' || cat.icon === 'Tag' || cat.icon.length === 1) {
          const emoji = await getCategoryEmojiFromGroq(cat.name);
          if (emoji && emoji !== '📌') {
            updatedCategories[i] = { ...cat, icon: emoji };
            await updateDoc(doc(db, 'categories', cat.id), { icon: emoji });
            madeChanges = true;
          }
        }
      }

      if (madeChanges) {
        setCategories(updatedCategories);
        alert('¡Emoticones actualizados con éxito para tus categorías antiguas!');
      } else {
        alert('Todas tus categorías ya tienen sus emoticones correctos.');
      }
    } catch (err: any) {
      console.error('Error al sincronizar emojis:', err);
      alert('Hubo un error al actualizar los emoticones.');
    } finally {
      setIsSyncingEmojis(false);
    }
  };

  const changeMonth = (delta: number) => {
    let newMonth = dateFilter.month + delta;
    let newYear = dateFilter.year;
    if (newMonth > 11) { newMonth = 0; newYear++; } 
    else if (newMonth < 0) { newMonth = 11; newYear--; }
    setDateFilter((prev) => ({ ...prev, month: newMonth, year: newYear }));
  };

  const monthName = new Date(dateFilter.year, dateFilter.month).toLocaleString('es-MX', { month: 'long', year: 'numeric' });
  const shortMonth = new Date(dateFilter.year, dateFilter.month).toLocaleString('es-MX', { month: 'short', year: 'numeric' }).replace('.', '');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Cargando Firebase...</p>
      </div>
    );
  }

  if (!session || isRecovering) {
    return <AuthPage initialMode={isRecovering ? 'reset' : 'login'} onFinishRecovery={() => setIsRecovering(false)} />;
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-6 shadow-lg"><AlertCircle size={32} /></div>
        <h2 className="text-2xl font-bold mb-2">Error de Sincronización</h2>
        <p className="max-w-md text-slate-600 dark:text-slate-400 mb-8 p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border font-mono text-xs overflow-auto">{initError}</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700">Reintentar</button>
          <button onClick={handleLogout} className="px-6 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold">Cerrar Sesión</button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
        <aside className="hidden lg:flex flex-col w-56 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-3 animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded mb-2" />)}
        </aside>
        <div className="flex-1 flex flex-col min-h-screen">
          <header className="h-12 sm:h-14 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded lg:hidden" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32" />
          </header>
          <main className="flex-1 px-3 sm:px-5 pt-4 sm:pt-6 max-w-5xl w-full mx-auto">
            <DashboardSkeleton />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-[#1e293b] flex-col">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-100 dark:border-[#1e293b]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-lg">FF</div>
            <div>
              <span className="font-bold text-lg tracking-tight block text-slate-800 dark:text-white">FinanzaFlow</span>
            </div>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {[
            { id: 'DASHBOARD' as ViewState, label: 'Inicio', icon: LayoutDashboard },
            { id: 'TRANSACTIONS' as ViewState, label: 'Movimientos', icon: List },
            { id: 'GOALS' as ViewState, label: 'Metas', icon: Trophy },
            { id: 'DEBTS' as ViewState, label: 'Deudas', icon: TrendingDown },
            { id: 'SETTINGS' as ViewState, label: 'Perfil', icon: Settings },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                view === item.id
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <item.icon size={20} className={view === item.id ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-[#1e293b] space-y-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" aria-label="Modo oscuro">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1">{session?.email?.split('@')[0] || 'Usuario'}</span>
            <button onClick={handleLogout} className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" title="Cerrar sesión"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 bg-slate-50 dark:bg-slate-950">
        
        {/* Main Content Area */}
        <main className="flex-1 px-4 sm:px-8 pt-6 sm:pt-8 pb-28 max-w-6xl w-full mx-auto">
          
          {/* Global View Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
                {view === 'DASHBOARD' ? 'Resumen' : 
                 view === 'TRANSACTIONS' ? 'Movimientos' : 
                 view === 'GOALS' ? 'Metas de Ahorro' : 
                 view === 'DEBTS' ? 'Deudas' : 'Ajustes'}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {view === 'DASHBOARD' ? 'Tu panorama financiero' : 'Gestiona tus finanzas paso a paso'}
              </p>
            </div>
            
            {/* Month Selector Pill */}
            <div className="flex items-center justify-center sm:justify-end gap-3">
              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm p-1">
                <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"><ChevronLeft size={16} /></button>
                <span className="px-4 text-sm font-medium capitalize w-32 text-center select-none text-slate-700 dark:text-slate-300">{monthName}</span>
                <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"><ChevronRight size={16} /></button>
              </div>
              <button onClick={() => setDarkMode(!darkMode)} className="hidden sm:flex p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Modo oscuro">
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>

          {view === 'DASHBOARD' && (
            <div className="space-y-6">
              <Dashboard transactions={filteredTransactions} categories={categories} accounts={derivedAccounts} onEdit={handleEditClick} onDelete={handleDeleteTransaction} goals={goals} onViewGoals={() => setView('GOALS')} />
              <EvolutionChart transactions={transactions} accounts={derivedAccounts} />
              <NetWorthChart transactions={transactions} accounts={derivedAccounts} />
              <BudgetPanel transactions={filteredTransactions} categories={categories} budgets={budgets} onSaveBudget={handleSaveBudget} onDeleteBudget={handleDeleteBudget} />
            </div>
          )}

          {view === 'TRANSACTIONS' && (
            <div className="animate-fade-in space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Movimientos</h2>
                <div className="flex items-center gap-2">
                  <ExportButton transactions={filteredTransactionsWithAdvanced} categories={categories} />
                  <span className="text-sm text-slate-500">{filteredTransactionsWithAdvanced.length} registros</span>
                </div>
              </div>
              <AdvancedFilters categories={categories} filters={advancedFilters} onChange={setAdvancedFilters} />
              <TransactionList transactions={filteredTransactionsWithAdvanced} categories={categories} onEdit={handleEditClick} onDelete={handleDeleteTransaction} />
            </div>
          )}

          {view === 'GOALS' && (
            <GoalsView
              goals={goals}
              transactions={transactions}
              onAdd={() => { setEditingGoal(null); setIsGoalModalOpen(true); }}
              onEdit={(g) => { setEditingGoal(g); setIsGoalModalOpen(true); }}
              onDelete={handleDeleteGoal}
            />
          )}

          {view === 'DEBTS' && (
            <DebtsView
              debts={debts}
              transactions={transactions}
              onAdd={() => { setEditingDebt(null); setIsDebtModalOpen(true); }}
              onEdit={(d) => { setEditingDebt(d); setIsDebtModalOpen(true); }}
              onDelete={handleDeleteDebt}
            />
          )}

          {view === 'SETTINGS' && (
            <div className="animate-fade-in pb-20 space-y-6">
              <div className="bg-gradient-to-br from-primary-600 to-indigo-700 p-5 sm:p-6 rounded-2xl shadow-lg text-white">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-2xl font-bold">{session?.email?.[0].toUpperCase() || 'U'}</div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest opacity-70 font-bold">Perfil Activo</p>
                    <p className="text-base font-bold truncate">{session?.email}</p>
                    <p className="text-xs opacity-80 mt-1">Sincronizado con Google Firebase ✅</p>
                  </div>
                </div>
              </div>

              {/* Export Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Exportar Datos</h3>
                <p className="text-xs text-slate-500">Descarga tus movimientos para llevar a Excel o contabilidad.</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => exportTransactionsToCSV(filteredTransactions, categories)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm"
                  >
                    <Download size={16} />
                    Exportar mes actual (CSV)
                  </button>
                  <button
                    onClick={() => exportTransactionsToCSV(transactions, categories)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl transition-all border border-slate-200 dark:border-slate-600"
                  >
                    <Download size={16} />
                    Exportar todo (CSV)
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Bottom Nav (Mobile) */}
        <nav className="fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 h-16 pb-safe z-30 lg:hidden">
          <div className="grid grid-cols-5 h-full max-w-lg mx-auto relative px-2">
            <button onClick={() => setView('DASHBOARD')} className={`flex flex-col items-center justify-center gap-1 transition-colors ${view === 'DASHBOARD' ? 'text-primary-600' : 'text-slate-400'}`}><LayoutDashboard size={22} /><span className="text-[10px] font-bold">Inicio</span></button>
            <button onClick={() => setView('GOALS')} className={`flex flex-col items-center justify-center gap-1 transition-colors ${view === 'GOALS' ? 'text-primary-600' : 'text-slate-400'}`}><Trophy size={22} /><span className="text-[10px] font-bold">Metas</span></button>
            <div className="relative flex justify-center items-center"><button onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }} className="absolute -top-6 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-xl flex items-center justify-center ring-4 ring-white dark:ring-slate-900" aria-label="Añadir"><Plus size={28} /></button></div>
            <button onClick={() => setView('DEBTS')} className={`flex flex-col items-center justify-center gap-1 transition-colors ${view === 'DEBTS' ? 'text-primary-600' : 'text-slate-400'}`}><CreditCard size={22} /><span className="text-[10px] font-bold">Deudas</span></button>
            <button onClick={() => setView('SETTINGS')} className={`flex flex-col items-center justify-center gap-1 transition-colors ${view === 'SETTINGS' ? 'text-primary-600' : 'text-slate-400'}`}><Settings size={22} /><span className="text-[10px] font-bold">Ajustes</span></button>
          </div>
        </nav>
      </div>

      {/* Notifications */}
      <NotificationBanner notifications={notifications} onDismiss={dismissNotification} />

      {/* Modals */}
      <TransactionForm key={isModalOpen ? editingTransaction?.id || 'new' : 'closed'} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveTransaction} onAddCategory={handleAddCategory} categories={categories} accounts={derivedAccounts} goals={goals} debts={debts} initialData={editingTransaction} defaultType={defaultFormType} />
      <FloatingCalculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
      <ConfirmationModal isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))} onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} isDestructive={confirmDialog.isDestructive} />
      <AIAssistantModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} categories={categories} accounts={derivedAccounts} onExecuteContext={handleAIExecute} />
      <RecurringDeleteModal isOpen={!!recurringDeleteTarget} onClose={() => setRecurringDeleteTarget(null)} onDeleteInstance={() => recurringDeleteTarget && performDeleteInstance(recurringDeleteTarget)} onDeleteSeries={() => recurringDeleteTarget && performDeleteSeries(recurringDeleteTarget)} />
      <CategoryFormModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} onAdd={handleAddCategory} />
      <GoalFormModal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} onSave={handleSaveGoal} initialData={editingGoal} />
      <DebtFormModal isOpen={isDebtModalOpen} onClose={() => setIsDebtModalOpen(false)} onSave={handleSaveDebt} initialData={editingDebt} />
    </div>
  );
};

export default App;

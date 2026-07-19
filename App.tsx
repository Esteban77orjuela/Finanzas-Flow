import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDocs, 
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
} from './types';
import {
  generateId,
  filterTransactions,
  generateMissingRecurringTransactions,
  roundToTwo,
  getCategoryEmojiFromGroq,
} from './utils';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import CategorySettings from './components/CategorySettings';
import PlanningDocs from './components/PlanningDocs';
import FloatingCalculator from './components/FloatingCalculator';
import { DashboardSkeleton } from './components/Skeleton';
import AuthPage from './components/AuthPage';
import AIAssistantModal from './components/AIAssistantModal';
import type { AIAction } from './components/AIAssistantModal';
import GoalsView from './components/GoalsView';
import DebtsView from './components/DebtsView';
import GoalFormModal from './components/GoalFormModal';
import DebtFormModal from './components/DebtFormModal';
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
  FileText,
  LogOut,
  AlertCircle,
  CreditCard,
  Menu,
  X,
  Trophy,
  TrendingDown,
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
  const validViews: ViewState[] = ['DASHBOARD', 'TRANSACTIONS', 'PLANNING', 'SETTINGS', 'GOALS', 'DEBTS'];
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

  // Goals & Debts State
  const [goals, setGoals] = useState<Goal[]>(() => readStorage<Goal[]>(STORAGE_KEYS.GOALS) || []);
  const [debts, setDebts] = useState<Debt[]>(() => readStorage<Debt[]>(STORAGE_KEYS.DEBTS) || []);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSyncingEmojis, setIsSyncingEmojis] = useState(false);

  // --- INITIAL DATA FETCH & MIGRATION (Firestore) ---
  useEffect(() => {
    if (!session) return;
    const initData = async () => {
      setIsLoading(true);
      try {
        console.warn('[FinanzaFlow] Sincronizando con Firestore...');

        // Parallel Fetch from Firestore
        const [catSnap, rulesSnap, transSnap, accSnap, goalsSnap, debtsSnap, exceptionsSnap] = await Promise.all([
          getDocs(query(collection(db, 'categories'), where('user_id', '==', session.uid))),
          getDocs(query(collection(db, 'recurrence_rules'), where('user_id', '==', session.uid))),
          getDocs(query(collection(db, 'transactions'), where('user_id', '==', session.uid))),
          getDocs(query(collection(db, 'accounts'), where('user_id', '==', session.uid))),
          getDocs(query(collection(db, 'goals'), where('user_id', '==', session.uid))),
          getDocs(query(collection(db, 'debts'), where('user_id', '==', session.uid))),
          getDocs(query(collection(db, 'recurrence_exceptions'), where('user_id', '==', session.uid))),
        ]);

        const mappedCategories: Category[] = catSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, name: data.name, type: data.type, color: data.color, icon: data.icon };
        });

        const mappedRules: RecurrenceRule[] = rulesSnap.docs.map(d => {
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
        });

        const mappedTransactions: Transaction[] = transSnap.docs.map(d => {
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
        });

        const mappedAccounts: Account[] = accSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, name: data.name, type: data.type, balance: data.balance };
        });

        const mappedGoals: Goal[] = goalsSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, name: data.name, targetAmount: data.targetAmount, currentAmount: data.currentAmount, targetDate: data.targetDate, color: data.color, icon: data.icon, createdAt: data.createdAt };
        });

        const mappedDebts: Debt[] = debtsSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, name: data.name, totalAmount: data.totalAmount, paidAmount: data.paidAmount, dueDate: data.dueDate, notes: data.notes, color: data.color, createdAt: data.createdAt };
        });

        // Load recurrence exceptions from Firestore
        const mappedExceptions: RecurrenceException[] = exceptionsSnap.docs.map(d => {
          const data = d.data();
          return { ruleId: data.ruleId, date: data.date };
        });
        // Merge with any local ones not yet synced
        const localExceptions = readStorage<RecurrenceException[]>(STORAGE_KEYS.RECURRENCE_EXCEPTIONS) || [];
        const mergedExceptions = [...mappedExceptions];
        for (const le of localExceptions) {
          const alreadyInFirestore = mappedExceptions.some(e => e.ruleId === le.ruleId && e.date === le.date);
          if (!alreadyInFirestore) {
            mergedExceptions.push(le);
            // Sync missing local exception to Firestore
            const exId = `${le.ruleId}_${le.date}`;
            await setDoc(doc(db, 'recurrence_exceptions', exId), { ...le, user_id: session.uid }).catch(() => {});
          }
        }

        // --- LOCAL MIGRATION LOGIC (If Firestore is empty) ---
        const localTrans = readStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS) || [];
        const localCats = readStorage<Category[]>(STORAGE_KEYS.CATEGORIES) || [];
        const localRules = readStorage<RecurrenceRule[]>(STORAGE_KEYS.RULES) || [];
        const localAccs = readStorage<Account[]>(STORAGE_KEYS.ACCOUNTS) || DEFAULT_ACCOUNTS;
        const localGoals = readStorage<Goal[]>(STORAGE_KEYS.GOALS) || [];
        const localDebts = readStorage<Debt[]>(STORAGE_KEYS.DEBTS) || [];

        let finalCats = mappedCategories;
        let finalAccs = mappedAccounts;
        let finalRules = mappedRules;
        let finalTrans = mappedTransactions;
        let finalGoals = mappedGoals;
        let finalDebts = mappedDebts;

        // Migrar locales a Firestore si está vacío
        if (mappedCategories.length === 0 && localCats.length > 0) {
          console.warn('[FinanzaFlow] Migrando categorías locales a Firebase...');
          for (const c of localCats) {
            await setDoc(doc(db, 'categories', c.id), { ...c, user_id: session.uid });
          }
          finalCats = localCats;
        }

        if (mappedAccounts.length === 0) {
          console.warn('[FinanzaFlow] Migrando cuentas locales a Firebase...');
          for (const a of localAccs) {
            await setDoc(doc(db, 'accounts', a.id), { ...a, user_id: session.uid });
          }
          finalAccs = localAccs;
        }

        if (mappedRules.length === 0 && localRules.length > 0) {
          console.warn('[FinanzaFlow] Migrando reglas locales a Firebase...');
          for (const r of localRules) {
            await setDoc(doc(db, 'recurrence_rules', r.id), {
              frequency: r.frequency,
              start_date: r.startDate,
              end_date: r.endDate ?? null,
              amount: r.amount,
              type: r.type,
              category_id: r.categoryId,
              account_id: r.accountId,
              note: r.note,
              base_date_day: r.baseDateDay,
              user_id: session.uid
            });
          }
          finalRules = localRules;
        }

        if (mappedTransactions.length === 0 && localTrans.length > 0) {
          console.warn('[FinanzaFlow] Migrando transacciones locales a Firebase...');
          for (const t of localTrans) {
            await setDoc(doc(db, 'transactions', t.id), {
              amount: t.amount,
              type: t.type,
              date: t.date,
              category_id: t.categoryId,
              account_id: t.accountId,
              note: t.note,
              is_recurring: t.isRecurring,
              recurrence_rule_id: t.recurrenceRuleId,
              user_id: session.uid
            });
          }
          finalTrans = localTrans;
        }

        if (mappedGoals.length === 0 && localGoals.length > 0) {
          for (const g of localGoals) {
            await setDoc(doc(db, 'goals', g.id), { ...g, user_id: session.uid });
          }
          finalGoals = localGoals;
        }

        if (mappedDebts.length === 0 && localDebts.length > 0) {
          for (const d of localDebts) {
            await setDoc(doc(db, 'debts', d.id), { ...d, user_id: session.uid });
          }
          finalDebts = localDebts;
        }

        setCategories(finalCats);
        setAccounts(finalAccs);
        setRecurrenceRules(finalRules);
        setTransactions(finalTrans);
        setGoals(finalGoals);
        setDebts(finalDebts);
        setRecurrenceExceptions(mergedExceptions);
      } catch (err: any) {
        console.error('Error inicializando Firestore:', err);
        setInitError(err.message);
        setTransactions(readStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS) || []);
        setCategories(readStorage<Category[]>(STORAGE_KEYS.CATEGORIES) || []);
        setAccounts(readStorage<Account[]>(STORAGE_KEYS.ACCOUNTS) || DEFAULT_ACCOUNTS);
        setGoals(readStorage<Goal[]>(STORAGE_KEYS.GOALS) || []);
        setDebts(readStorage<Debt[]>(STORAGE_KEYS.DEBTS) || []);
      } finally {
        setIsLoading(false);
      }
    };

    initData();
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

      // UPDATE ACCOUNT BALANCE
      if (transactionsToSync.length > 0) {
        const accountId = transactionsToSync[0].accountId;
        const accountTransactions = newTransactions.filter((tx) => tx.accountId === accountId);
        const newBalance = roundToTwo(
          accountTransactions.reduce((acc, tx) => tx.type === 'INCOME' ? acc + tx.amount : acc - tx.amount, 0)
        );
        await updateDoc(doc(db, 'accounts', accountId), { balance: newBalance, user_id: session.uid });
        setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, balance: newBalance } : a)));
      }

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

    const accountTransactions = updatedTransactions.filter((t) => t.accountId === tx.accountId);
    const newBalance = roundToTwo(accountTransactions.reduce((acc, t) => (t.type === 'INCOME' ? acc + t.amount : acc - t.amount), 0));
    await updateDoc(doc(db, 'accounts', tx.accountId), { balance: newBalance, user_id: session!.uid });
    setAccounts((prev) => prev.map((a) => (a.id === tx.accountId ? { ...a, balance: newBalance } : a)));
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

    const accountTransactions = updatedTransactions.filter((t) => t.accountId === tx.accountId);
    const newBalance = roundToTwo(accountTransactions.reduce((acc, t) => (t.type === 'INCOME' ? acc + t.amount : acc - t.amount), 0));
    await updateDoc(doc(db, 'accounts', tx.accountId), { balance: newBalance, user_id: session.uid });
    setAccounts((prev) => prev.map((a) => (a.id === tx.accountId ? { ...a, balance: newBalance } : a)));
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

        const accountTransactions = updatedTransactions.filter((t) => t.accountId === tx.accountId);
        const newBalance = roundToTwo(accountTransactions.reduce((acc, t) => (t.type === 'INCOME' ? acc + t.amount : acc - t.amount), 0));
        if (session) await updateDoc(doc(db, 'accounts', tx.accountId), { balance: newBalance, user_id: session.uid });
        setAccounts((prev) => prev.map((a) => (a.id === tx.accountId ? { ...a, balance: newBalance } : a)));
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
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-[#1e293b] flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-100 dark:border-[#1e293b]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-lg">FF</div>
              <div>
                <span className="font-bold text-lg tracking-tight block text-slate-800 dark:text-white">FinanzaFlow</span>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 lg:hidden"><X size={18} /></button>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {[
            { id: 'DASHBOARD' as ViewState, label: 'Inicio', icon: LayoutDashboard },
            { id: 'TRANSACTIONS' as ViewState, label: 'Movimientos', icon: List },
            { id: 'ASISTENTE' as ViewState, label: 'Asistente', icon: Sparkles },
            { id: 'GOALS' as ViewState, label: 'Metas', icon: Trophy },
            { id: 'DEBTS' as ViewState, label: 'Deudas', icon: TrendingDown },
            { id: 'PLANNING' as ViewState, label: 'Planificación', icon: FileText },
            { id: 'SETTINGS' as ViewState, label: 'Perfil', icon: Settings },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => { 
                if (item.label === 'Asistente') setIsAIModalOpen(true); 
                else setView(item.id); 
                setSidebarOpen(false); 
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                (view === item.id && item.label !== 'Asistente')
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <item.icon size={20} className={(view === item.id && item.label !== 'Asistente') ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'} />
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
        
        {/* Mobile Header (Only for hamburger menu) */}
        <div className="lg:hidden flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Menú">
            <Menu size={22} />
          </button>
          <span className="font-bold text-sm text-slate-800 dark:text-white">FinanzaFlow</span>
          <div className="w-8"></div> {/* Spacer for centering */}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 px-4 sm:px-8 pt-6 sm:pt-8 pb-28 max-w-6xl w-full mx-auto">
          
          {/* Global View Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
                {view === 'DASHBOARD' ? 'Resumen' : 
                 view === 'TRANSACTIONS' ? 'Movimientos' : 
                 view === 'GOALS' ? 'Metas de Ahorro' : 
                 view === 'DEBTS' ? 'Deudas' : 
                 view === 'PLANNING' ? 'Planificación' : 'Ajustes'}
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
            <>
              <Dashboard transactions={filteredTransactions} categories={categories} accounts={accounts} onEdit={handleEditClick} onDelete={handleDeleteTransaction} goals={goals} onViewGoals={() => setView('GOALS')} />
            </>
          )}

          {view === 'TRANSACTIONS' && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Movimientos</h2>
                <span className="text-sm text-slate-500">{filteredTransactions.length} registros</span>
              </div>
              <TransactionList transactions={filteredTransactions} categories={categories} onEdit={handleEditClick} onDelete={handleDeleteTransaction} />
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
            <div className="animate-fade-in pb-20 space-y-4">
              <div className="bg-gradient-to-br from-primary-600 to-indigo-700 p-4 rounded-xl shadow-lg text-white mb-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-xl font-bold">{session?.email?.[0].toUpperCase() || 'U'}</div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest opacity-70 font-bold">Perfil Activo</p>
                    <p className="text-sm font-bold truncate">{session?.email}</p>
                    <p className="text-[10px] opacity-80 mt-0.5">Sincronizado con Google Firebase ✅</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-lg text-violet-600 dark:text-violet-400"><Sparkles size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Groq AI</h3>
                    <p className="text-xs text-slate-500">Clave API configurada en variables de entorno</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${import.meta.env.VITE_GROQ_API_KEY ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>{import.meta.env.VITE_GROQ_API_KEY ? 'Configurada' : 'Faltante'}</span>
                </div>
                {import.meta.env.VITE_GROQ_API_KEY && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <button 
                      onClick={handleSyncEmojis}
                      disabled={isSyncingEmojis}
                      className="w-full py-2.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold rounded-lg hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors flex items-center justify-center gap-2"
                    >
                      {isSyncingEmojis ? (
                        <>
                          <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                          Analizando categorías antiguas...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          Actualizar Emojis Antiguos con IA
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400"><FileText size={20} /></div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Documentación</h3>
                    <p className="text-xs text-slate-500">Guía y planificación</p>
                  </div>
                </div>
                <button onClick={() => setView('PLANNING')} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors">Abrir</button>
              </div>
              <CategorySettings categories={categories} onAdd={handleAddCategory} onUpdate={handleUpdateCategory} onDelete={handleDeleteCategory} onOpenAddModal={() => setIsCategoryModalOpen(true)} />
            </div>
          )}

          {view === 'PLANNING' && (
            <div className="animate-fade-in">
              <button onClick={() => setView('SETTINGS')} className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-bold text-sm mb-6 hover:underline"><ChevronLeft size={16} /> Volver a Ajustes</button>
              <PlanningDocs />
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

      {/* Modals */}
      <TransactionForm key={isModalOpen ? editingTransaction?.id || 'new' : 'closed'} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveTransaction} onAddCategory={handleAddCategory} categories={categories} accounts={accounts} goals={goals} debts={debts} initialData={editingTransaction} defaultType={defaultFormType} />
      <FloatingCalculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
      <ConfirmationModal isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))} onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} isDestructive={confirmDialog.isDestructive} />
      <AIAssistantModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} categories={categories} accounts={accounts} onExecuteContext={handleAIExecute} />
      <RecurringDeleteModal isOpen={!!recurringDeleteTarget} onClose={() => setRecurringDeleteTarget(null)} onDeleteInstance={() => recurringDeleteTarget && performDeleteInstance(recurringDeleteTarget)} onDeleteSeries={() => recurringDeleteTarget && performDeleteSeries(recurringDeleteTarget)} />
      <CategoryFormModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} onAdd={handleAddCategory} />
      <GoalFormModal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} onSave={handleSaveGoal} initialData={editingGoal} />
      <DebtFormModal isOpen={isDebtModalOpen} onClose={() => setIsDebtModalOpen(false)} onSave={handleSaveDebt} initialData={editingDebt} />
    </div>
  );
};

export default App;

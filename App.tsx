import React, { useState, useEffect, useMemo } from 'react';
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
} from './types';
import {
  generateId,
  filterTransactions,
  generateMissingRecurringTransactions,
  roundToTwo,
} from './utils';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import QuickActionPanel from './components/QuickActionPanel';
import CategorySettings from './components/CategorySettings';
import PlanningDocs from './components/PlanningDocs';
import FloatingCalculator from './components/FloatingCalculator';
import AuthPage from './components/AuthPage';
import AIAssistantModal, { AIAction } from './components/AIAssistantModal';
import {
  LayoutDashboard,
  List,
  Plus,
  Sparkles,
  Settings,
  Calculator,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  FileText,
  LogOut,
  AlertCircle,
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

  const month =
    typeof candidate.month === 'number' && candidate.month >= 0 && candidate.month <= 11
      ? candidate.month
      : fallback.month;
  const year =
    typeof candidate.year === 'number' && candidate.year > 1900 ? candidate.year : fallback.year;

  return { month, year };
};

const getInitialDateFilter = (): DateFilter => {
  const now = new Date();
  const fallback: DateFilter = {
    month: now.getMonth(),
    year: now.getFullYear(),
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

  // --- INITIAL DATA FETCH & MIGRATION (Firestore) ---
  useEffect(() => {
    if (!session) return;
    const initData = async () => {
      setIsLoading(true);
      try {
        console.warn('[FinanzaFlow] Sincronizando con Firestore...');

        // Parallel Fetch from Firestore
        const [catSnap, rulesSnap, transSnap, accSnap] = await Promise.all([
          getDocs(query(collection(db, 'categories'), where('user_id', '==', session.uid))),
          getDocs(query(collection(db, 'recurrence_rules'), where('user_id', '==', session.uid))),
          getDocs(query(collection(db, 'transactions'), where('user_id', '==', session.uid))),
          getDocs(query(collection(db, 'accounts'), where('user_id', '==', session.uid))),
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
          };
        });

        const mappedAccounts: Account[] = accSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, name: data.name, type: data.type, balance: data.balance };
        });

        // --- LOCAL MIGRATION LOGIC (If Firestore is empty) ---
        const localTrans = readStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS) || [];
        const localCats = readStorage<Category[]>(STORAGE_KEYS.CATEGORIES) || [];
        const localRules = readStorage<RecurrenceRule[]>(STORAGE_KEYS.RULES) || [];
        const localAccs = readStorage<Account[]>(STORAGE_KEYS.ACCOUNTS) || DEFAULT_ACCOUNTS;

        let finalCats = mappedCategories;
        let finalAccs = mappedAccounts;
        let finalRules = mappedRules;
        let finalTrans = mappedTransactions;

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

        setCategories(finalCats);
        setAccounts(finalAccs);
        setRecurrenceRules(finalRules);
        setTransactions(finalTrans);
        setRecurrenceExceptions(readStorage<RecurrenceException[]>(STORAGE_KEYS.RECURRENCE_EXCEPTIONS) || []);
      } catch (err: any) {
        console.error('Error inicializando Firestore:', err);
        setInitError(err.message);
        setTransactions(readStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS) || []);
        setCategories(readStorage<Category[]>(STORAGE_KEYS.CATEGORIES) || []);
        setAccounts(readStorage<Account[]>(STORAGE_KEYS.ACCOUNTS) || DEFAULT_ACCOUNTS);
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
  useEffect(() => {
    if (recurrenceRules.length > 0 && session) {
      const generated = generateMissingRecurringTransactions(
        recurrenceRules,
        transactions,
        dateFilter.month,
        dateFilter.year,
        recurrenceExceptions
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
  }, [dateFilter.month, dateFilter.year, recurrenceRules, recurrenceExceptions, transactions, session]);

  // --- AI EXECUTION LOGIC ---
  const handleAIExecute = async (actions: AIAction[]) => {
    if (!session?.uid) return;

    setIsLoading(true);
    try {
      const uId = session.uid;
      const newTransactions: Transaction[] = [];
      const newRules: RecurrenceRule[] = [];
      const freshCategories = [...categories];

      for (const action of actions) {
        let amountNum = typeof action.amount === 'string' ? parseFloat(action.amount) : action.amount;
        if (isNaN(amountNum)) amountNum = 0;

        const validDate = action.date || new Date().toISOString().split('T')[0];

        let cat = freshCategories.find(c => 
          c.name.toLowerCase().includes(action.categoryName.toLowerCase()) || 
          action.categoryName.toLowerCase().includes(c.name.toLowerCase())
        );

        if (!cat) {
          const newCat: Category = {
            id: generateId(),
            name: action.categoryName || 'Sin Categoría',
            type: action.transactionType,
            color: action.transactionType === TransactionType.INCOME ? '#10b981' : '#f43f5e',
            icon: 'Tag',
          };

          await setDoc(doc(db, 'categories', newCat.id), { ...newCat, user_id: uId });
          cat = newCat;
          freshCategories.push(newCat);
        }

        const acc = accounts.find(a => a.name.toLowerCase().includes(action.accountName.toLowerCase())) || accounts[0];

        if (action.type === 'RECURRING') {
          const ruleId = generateId();
          const dayNum = parseInt(validDate.split('-')[2]) || 1;

          const rule: RecurrenceRule = {
            id: ruleId,
            amount: amountNum,
            type: action.transactionType,
            categoryId: cat.id,
            accountId: acc.id,
            frequency: action.frequency || 'MONTHLY',
            startDate: validDate,
            note: (action.description || 'Gasto IA') + ' (IA)',
            baseDateDay: dayNum,
          };

          await setDoc(doc(db, 'recurrence_rules', rule.id), {
            frequency: rule.frequency,
            start_date: rule.startDate,
            amount: rule.amount,
            type: rule.type,
            category_id: rule.categoryId,
            account_id: rule.accountId,
            note: rule.note,
            base_date_day: rule.baseDateDay,
            user_id: uId
          });
          newRules.push(rule);
        } else {
          const txId = generateId();
          const tx: Transaction = {
            id: txId,
            amount: amountNum,
            type: action.transactionType,
            date: validDate,
            categoryId: cat.id,
            accountId: acc.id,
            note: action.description || 'Transacción IA',
            isRecurring: false,
          };

          await setDoc(doc(db, 'transactions', tx.id), {
            amount: tx.amount,
            type: tx.type,
            date: tx.date,
            category_id: tx.categoryId,
            account_id: tx.accountId,
            note: tx.note,
            is_recurring: false,
            user_id: uId
          });
          newTransactions.push(tx);
        }
      }

      setCategories(freshCategories);
      setTransactions((prev) => [...prev, ...newTransactions]);
      setRecurrenceRules((prev) => [...prev, ...newRules]);
    } catch (error) {
      console.error('AI Execution Error', error);
      alert('Error de la IA');
    } finally {
      setIsLoading(false);
    }
  };

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
            setRecurrenceExceptions((prev) => [...prev, { ruleId: editingTransaction.recurrenceRuleId!, date: editingTransaction.date }]);

            const updatedTx: Transaction = {
              ...t,
              id: editingTransaction.id,
              isRecurring: false,
              recurrenceRuleId: undefined,
            };
            newTransactions = newTransactions.map((item) =>
              item.id === editingTransaction.id ? updatedTx : item
            );
            transactionsToSync.push(updatedTx);
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

      setRecurrenceRules(newRules);
      setTransactions(newTransactions);
      setEditingTransaction(null);
      setIsModalOpen(false);

      // --- FIRESTORE SYNC ---
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
        await updateDoc(doc(db, 'accounts', accountId), { balance: newBalance });
        setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, balance: newBalance } : a)));
      }
    } catch (error: any) {
      console.error('Error al guardar:', error);
      alert('Error al guardar: ' + (error?.message || 'Error desconocido. Revisa la consola (F12).'));
    }
  };

  const performDeleteInstance = async (tx: Transaction) => {
    if (!tx || !tx.recurrenceRuleId || !session) return;
    setRecurrenceExceptions((prev) => [...prev, { ruleId: tx.recurrenceRuleId!, date: tx.date }]);
    const updatedTransactions = transactions.filter((t) => t.id !== tx.id);
    setTransactions(updatedTransactions);
    setRecurringDeleteTarget(null);

    await deleteDoc(doc(db, 'transactions', tx.id));

    const accountTransactions = updatedTransactions.filter((t) => t.accountId === tx.accountId);
    const newBalance = roundToTwo(accountTransactions.reduce((acc, t) => (t.type === 'INCOME' ? acc + t.amount : acc - t.amount), 0));
    await updateDoc(doc(db, 'accounts', tx.accountId), { balance: newBalance });
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
    await updateDoc(doc(db, 'accounts', tx.accountId), { balance: newBalance });
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
        await updateDoc(doc(db, 'accounts', tx.accountId), { balance: newBalance });
        setAccounts((prev) => prev.map((a) => (a.id === tx.accountId ? { ...a, balance: newBalance } : a)));
      },
    });
  };

  const handleAddCategory = async (category: Category) => {
    if (!session) return;
    setCategories((prev) => [...prev, category]);
    await setDoc(doc(db, 'categories', category.id), { ...category, user_id: session.uid });
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

  const changeMonth = (delta: number) => {
    let newMonth = dateFilter.month + delta;
    let newYear = dateFilter.year;
    if (newMonth > 11) { newMonth = 0; newYear++; } 
    else if (newMonth < 0) { newMonth = 11; newYear--; }
    setDateFilter((prev) => ({ ...prev, month: newMonth, year: newYear }));
  };

  const monthName = new Date(dateFilter.year, dateFilter.month).toLocaleString('es-MX', { month: 'long', year: 'numeric' });

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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-medium text-slate-600 dark:text-slate-400 animate-pulse">Sincronizando con Google Firebase...</p>
        <button onClick={handleLogout} className="mt-8 text-sm text-slate-400 hover:text-rose-500 underline decoration-dotted">¿Atascado? Cerrar sesión</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      <header className="fixed top-0 w-full z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 h-12 sm:h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0">F</div>
            <span className="font-bold text-lg tracking-tight hidden sm:block">FinanzaFlow</span>
            <button onClick={() => setIsAIModalOpen(true)} className="ml-1 sm:ml-3 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] sm:text-xs font-bold rounded-full shadow-lg flex items-center gap-1 hover:brightness-110 transition-all animate-pulse"><Sparkles size={12} className="text-yellow-300" /><span className="hidden xs:inline">Asistente IA</span></button>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            {session?.email && <span className="hidden xs:block text-[10px] sm:text-xs text-slate-500 font-medium truncate max-w-[80px] sm:max-w-[150px] mr-1">{session.email.split('@')[0]}</span>}
            <button onClick={() => setDarkMode(!darkMode)} className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg">{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button onClick={handleLogout} className="p-1.5 sm:p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"><LogOut size={18} /></button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-3 sm:px-4 h-10 flex items-center justify-center border-t border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 sm:p-1">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md"><ChevronLeft size={16} /></button>
            <span className="px-2 sm:px-3 text-xs sm:text-sm font-medium capitalize w-28 sm:w-32 text-center select-none">{monthName}</span>
            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md"><ChevronRight size={16} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 pt-[5.5rem] sm:pt-[6.5rem] pb-24">

        {view === 'DASHBOARD' && (
          <>
            <QuickActionPanel onAddExpense={() => { setEditingTransaction(null); setDefaultFormType(TransactionType.EXPENSE); setIsModalOpen(true); }} onAddIncome={() => { setEditingTransaction(null); setDefaultFormType(TransactionType.INCOME); setIsModalOpen(true); }} onOpenAI={() => setIsAIModalOpen(true)} onAddCategory={() => setIsCategoryModalOpen(true)} />
            <Dashboard transactions={filteredTransactions} categories={categories} onEdit={handleEditClick} onDelete={handleDeleteTransaction} />
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

      <nav className="fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 h-16 pb-safe z-50">
        <div className="grid grid-cols-5 h-full max-w-lg mx-auto relative px-2">
          <button onClick={() => setView('DASHBOARD')} className={`flex flex-col items-center justify-center gap-1 transition-colors ${view === 'DASHBOARD' ? 'text-primary-600' : 'text-slate-400'}`}><LayoutDashboard size={22} /><span className="text-[10px] font-bold">Inicio</span></button>
          <button onClick={() => setView('TRANSACTIONS')} className={`flex flex-col items-center justify-center gap-1 transition-colors ${view === 'TRANSACTIONS' ? 'text-primary-600' : 'text-slate-400'}`}><List size={22} /><span className="text-[10px] font-bold">Historial</span></button>
          <div className="relative flex justify-center items-center"><button onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }} className="absolute -top-6 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-xl flex items-center justify-center ring-4 ring-white dark:ring-slate-900" aria-label="Añadir"><Plus size={28} /></button></div>
          <button onClick={() => setIsCalculatorOpen(true)} className={`flex flex-col items-center justify-center gap-1 transition-colors ${isCalculatorOpen ? 'text-primary-600' : 'text-slate-400'}`}><Calculator size={22} /><span className="text-[10px] font-bold">Cálculo</span></button>
          <button onClick={() => setView('SETTINGS')} className={`flex flex-col items-center justify-center gap-1 transition-colors ${view === 'SETTINGS' ? 'text-primary-600' : 'text-slate-400'}`}><Settings size={22} /><span className="text-[10px] font-bold">Ajustes</span></button>
        </div>
      </nav>

      <TransactionForm key={isModalOpen ? editingTransaction?.id || 'new' : 'closed'} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveTransaction} onAddCategory={handleAddCategory} categories={categories} accounts={accounts} initialData={editingTransaction} defaultType={defaultFormType} />
      <FloatingCalculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
      <ConfirmationModal isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))} onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} isDestructive={confirmDialog.isDestructive} />
      <AIAssistantModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} transactions={transactions} categories={categories} accounts={accounts} onExecuteContext={handleAIExecute} />
      <RecurringDeleteModal isOpen={!!recurringDeleteTarget} onClose={() => setRecurringDeleteTarget(null)} onDeleteInstance={() => recurringDeleteTarget && performDeleteInstance(recurringDeleteTarget)} onDeleteSeries={() => recurringDeleteTarget && performDeleteSeries(recurringDeleteTarget)} />
      <CategoryFormModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} onAdd={handleAddCategory} />
    </div>
  );
};

export default App;

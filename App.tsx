import React, { useState, useEffect, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Transaction,
  Category,
  Account,
  ViewState,
  DateFilter,
  PeriodType,
  TransactionType,
  RecurrenceRule,
  Frequency,
} from './types';
import { generateId, filterTransactions, generateMissingRecurringTransactions } from './utils';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import CategorySettings from './components/CategorySettings';
import PlanningDocs from './components/PlanningDocs';
import FloatingCalculator from './components/FloatingCalculator';
import AuthPage from './components/AuthPage';
import {
  LayoutDashboard,
  List,
  Plus,
  Settings,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  FileText,
  LogOut,
} from 'lucide-react';
import ConfirmationModal from './components/ConfirmationModal';
import RecurringDeleteModal from './components/RecurringDeleteModal';
import { supabase } from './supabaseClient';
import { AlertCircle } from 'lucide-react';

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

  const month =
    typeof candidate.month === 'number' && candidate.month >= 0 && candidate.month <= 11
      ? candidate.month
      : fallback.month;
  const year =
    typeof candidate.year === 'number' && candidate.year > 1900 ? candidate.year : fallback.year;
  const validPeriods: DateFilter['period'][] = [
    'ALL',
    PeriodType.Q1,
    PeriodType.Q2,
    PeriodType.MONTH,
  ];
  const period =
    candidate.period && validPeriods.includes(candidate.period)
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
  // Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Listen for auth changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    console.log('[FinanzaFlow] Cerrando sesión...');
    try {
      // Intentar cerrar sesión en Supabase, pero no bloquearse si falla
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000)),
      ]).catch((e) => console.warn('[FinanzaFlow] Supabase signOut falló o tardó demasiado:', e));
    } catch (err) {
      console.error('[FinanzaFlow] Error al cerrar sesión:', err);
    }

    // Limpiar TODO pase lo que pase con Supabase
    if (isBrowser) {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }
    setSession(null);
    setTransactions([]);
    setCategories([]);
    setAccounts(DEFAULT_ACCOUNTS);
    setRecurrenceRules([]);
    setIsLoading(false);
    console.log('[FinanzaFlow] Sesión limpiada localmente.');

    // Forzar recarga total para asegurar estado limpio
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
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Modal States
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false,
  });

  const [recurringDeleteTarget, setRecurringDeleteTarget] = useState<Transaction | null>(null);

  // Date Filtering State
  const [dateFilter, setDateFilter] = useState<DateFilter>(getInitialDateFilter);

  // --- INITIAL DATA FETCH & MIGRATION ---
  useEffect(() => {
    if (!session) return;
    const initData = async () => {
      setIsLoading(true);
      try {
        const supUrl = (supabase as any).supabaseUrl || '';
        console.log('[FinanzaFlow] Verificando conexión...', supUrl);

        if (!supUrl || supUrl.includes('placeholder') || !supUrl.startsWith('http')) {
          throw new Error(
            'La URL de Supabase no es válida. Verifica las variables de entorno (debe empezar con https://).'
          );
        }

        console.log('[FinanzaFlow] Iniciando descarga de datos (con timeout de 10s)...');

        // Timeout de seguridad: Si en 10s no responde, dar error
        const fetchWithTimeout = Promise.race([
          Promise.all([
            supabase.from('categories').select('*'),
            supabase.from('recurrence_rules').select('*'),
            supabase.from('transactions').select('*'),
            supabase.from('accounts').select('*'),
          ]),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error('Tiempo de espera agotado. Verifica la conexión o la URL de Supabase.')
                ),
              10000
            )
          ),
        ]) as Promise<any[]>;

        const [catRes, rulesRes, transRes, accRes] = await fetchWithTimeout;

        console.log('[FinanzaFlow] Respuesta recibida:', {
          cats: catRes.data?.length,
          rules: rulesRes.data?.length,
          txs: transRes.data?.length,
          accs: accRes.data?.length,
        });

        const mappedCategories: Category[] = (catRes.data || []).map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          color: c.color,
          icon: c.icon,
        }));

        const mappedRules: RecurrenceRule[] = (rulesRes.data || []).map((r) => ({
          id: r.id,
          frequency: r.frequency,
          quincenaN: r.quincena_n,
          startDate: r.start_date,
          endDate: r.end_date,
          amount: parseFloat(r.amount),
          type: r.type,
          categoryId: r.category_id,
          accountId: r.account_id,
          note: r.note,
          baseDateDay: r.base_date_day,
        }));

        const mappedTransactions: Transaction[] = (transRes.data || []).map((t) => ({
          id: t.id,
          amount: parseFloat(t.amount),
          type: t.type,
          date: t.date,
          categoryId: t.category_id,
          accountId: t.account_id,
          note: t.note,
          isRecurring: t.is_recurring,
          recurrenceRuleId: t.recurrence_rule_id,
        }));

        const mappedAccounts: Account[] = (accRes.data || []).map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          balance: parseFloat(a.balance),
        }));

        // 2. INDIVIDUAL MIGRATION (Check each table independently)
        const localTrans = readStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS) || [];
        const localCats = readStorage<Category[]>(STORAGE_KEYS.CATEGORIES) || [];
        const localRules = readStorage<RecurrenceRule[]>(STORAGE_KEYS.RULES) || [];
        const localAccs = readStorage<Account[]>(STORAGE_KEYS.ACCOUNTS) || DEFAULT_ACCOUNTS;

        let finalCats = mappedCategories;
        let finalAccs = mappedAccounts;
        let finalRules = mappedRules;
        let finalTrans = mappedTransactions;

        // Migrar Categorías si están vacías en Supabase
        if (mappedCategories.length === 0 && localCats.length > 0) {
          console.warn('[FinanzaFlow] Migrando categorías locales...');
          await supabase.from('categories').insert(
            localCats.map((c) => ({
              id: c.id,
              name: c.name,
              type: c.type,
              color: c.color,
              icon: c.icon,
            }))
          );
          finalCats = localCats;
        }

        // Migrar Cuentas si están vacías en Supabase (O subir DEFAULT_ACCOUNTS)
        if (mappedAccounts.length === 0) {
          console.warn('[FinanzaFlow] Migrando cuentas locales...');
          await supabase.from('accounts').insert(
            localAccs.map((a) => ({
              id: a.id,
              name: a.name,
              type: a.type,
              balance: a.balance,
            }))
          );
          finalAccs = localAccs;
        }

        // Migrar Reglas si están vacías en Supabase
        if (mappedRules.length === 0 && localRules.length > 0) {
          console.warn('[FinanzaFlow] Migrando reglas locales...');
          await supabase.from('recurrence_rules').insert(
            localRules.map((r) => ({
              id: r.id,
              frequency: r.frequency,
              quincena_n: r.quincenaN,
              start_date: r.startDate,
              end_date: r.endDate,
              amount: r.amount,
              type: r.type,
              category_id: r.categoryId,
              account_id: r.accountId,
              note: r.note,
              base_date_day: r.baseDateDay,
            }))
          );
          finalRules = localRules;
        }

        // Migrar Transacciones si están vacías en Supabase
        if (mappedTransactions.length === 0 && localTrans.length > 0) {
          console.warn('[FinanzaFlow] Migrando transacciones locales...');
          await supabase.from('transactions').insert(
            localTrans.map((t) => ({
              id: t.id,
              amount: t.amount,
              type: t.type,
              date: t.date,
              category_id: t.categoryId,
              account_id: t.accountId,
              note: t.note,
              is_recurring: t.isRecurring,
              recurrence_rule_id: t.recurrenceRuleId,
            }))
          );
          finalTrans = localTrans;
        }

        // 3. SET FINAL STATES
        setCategories(finalCats);
        setAccounts(finalAccs);
        setRecurrenceRules(finalRules);
        setTransactions(finalTrans);
      } catch (err: any) {
        console.error('Error inicializando Supabase:', err);
        setInitError(err.message);
        // Fallback to local
        setTransactions(readStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS) || []);
        setCategories(readStorage<Category[]>(STORAGE_KEYS.CATEGORIES) || []);
        setAccounts(readStorage<Account[]>(STORAGE_KEYS.ACCOUNTS) || DEFAULT_ACCOUNTS);
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, [session]);

  // --- PERSISTENCE: Save to BOTH for extra safety ---
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
        setTransactions((prev) => [...prev, ...generated]);

        // SYNC auto-generated recurring transactions to Supabase
        const syncGenerated = async () => {
          for (const tx of generated) {
            const { error } = await supabase.from('transactions').upsert({
              id: tx.id,
              amount: tx.amount,
              type: tx.type,
              date: tx.date,
              category_id: tx.categoryId,
              account_id: tx.accountId,
              note: tx.note,
              is_recurring: tx.isRecurring,
              recurrence_rule_id: tx.recurrenceRuleId,
            });
            if (error) console.error('[Supabase] Error sincronizando tx recurrente:', error);
          }
        };
        syncGenerated();
      }
    }
  }, [dateFilter.month, dateFilter.year, recurrenceRules, recurrenceExceptions]);

  // Derived Data
  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, dateFilter.month, dateFilter.year, dateFilter.period),
    [transactions, dateFilter]
  );

  // Actions

  const handleEditClick = (t: Transaction) => {
    console.log('handleEditClick called with:', t);
    setEditingTransaction(t);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (
    t: Transaction,
    options?: {
      createRule: boolean;
      frequency: Frequency;
      quincenaN?: 'Q1' | 'Q2';
      updateFuture: boolean;
    }
  ) => {
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
          quincenaN: options.quincenaN,
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
          const oldRuleIndex = newRules.findIndex(
            (r) => r.id === editingTransaction.recurrenceRuleId
          );

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
              quincenaN: options.quincenaN,
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
          if (editingTransaction.isRecurring) {
            const detachedTx: Transaction = {
              ...t,
              id: generateId(),
              isRecurring: false,
              recurrenceRuleId: undefined,
            };
            newTransactions = [...newTransactions, detachedTx];
            transactionsToSync.push(detachedTx);
          } else {
            const updatedTx: Transaction = {
              ...t,
              id: editingTransaction.id,
            };
            newTransactions = newTransactions.map((item) =>
              item.id === editingTransaction.id ? updatedTx : item
            );
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

      // --- SUPABASE SYNC (ALL pending items) ---
      for (const rule of rulesToSync) {
        const { error } = await supabase.from('recurrence_rules').upsert({
          id: rule.id,
          frequency: rule.frequency,
          quincena_n: rule.quincenaN,
          start_date: rule.startDate,
          end_date: rule.endDate,
          amount: rule.amount,
          type: rule.type,
          category_id: rule.categoryId,
          account_id: rule.accountId,
          note: rule.note,
          base_date_day: rule.baseDateDay,
        });
        if (error) console.error('[Supabase] Error sincronizando regla:', error);
      }

      for (const tx of transactionsToSync) {
        console.log('[Supabase] Sincronizando transacción:', tx.id, tx.amount);
        const { error } = await supabase.from('transactions').upsert({
          id: tx.id,
          amount: tx.amount,
          type: tx.type,
          date: tx.date,
          category_id: tx.categoryId,
          account_id: tx.accountId,
          note: tx.note,
          is_recurring: tx.isRecurring,
          recurrence_rule_id: tx.recurrenceRuleId,
        });
        if (error) {
          console.error('[Supabase] Error al guardar transacción:', error);
          alert('Error al sincronizar transacción: ' + error.message);
        }
      }

      // UPDATE ACCOUNT BALANCE
      if (transactionsToSync.length > 0) {
        const accountId = transactionsToSync[0].accountId;
        const accountTransactions = newTransactions.filter((tx) => tx.accountId === accountId);
        const newBalance = accountTransactions.reduce((acc, tx) => {
          return tx.type === 'INCOME' ? acc + tx.amount : acc - tx.amount;
        }, 0);
        await supabase.from('accounts').update({ balance: newBalance }).eq('id', accountId);
        setAccounts((prev) =>
          prev.map((a) => (a.id === accountId ? { ...a, balance: newBalance } : a))
        );
      }
    } catch (error) {
      console.error('Error al guardar la transacción:', error);
      alert('Hubo un error al guardar la transacción. Por favor, inténtalo de nuevo.');
    }
  };

  const performDeleteInstance = async (tx: Transaction) => {
    if (!tx || !tx.recurrenceRuleId) return;

    setRecurrenceExceptions((prev) => {
      if (prev.some((e) => e.ruleId === tx.recurrenceRuleId && e.date === tx.date)) return prev;
      return [...prev, { ruleId: tx.recurrenceRuleId!, date: tx.date }];
    });
    const updatedTransactions = transactions.filter((t) => t.id !== tx.id);
    setTransactions(updatedTransactions);
    setRecurringDeleteTarget(null);

    // Sync deletion
    await supabase.from('transactions').delete().eq('id', tx.id);

    // Update Balance
    const accountTransactions = updatedTransactions.filter((t) => t.accountId === tx.accountId);
    const newBalance = accountTransactions.reduce(
      (acc, t) => (t.type === 'INCOME' ? acc + t.amount : acc - t.amount),
      0
    );
    await supabase.from('accounts').update({ balance: newBalance }).eq('id', tx.accountId);
    setAccounts((prev) =>
      prev.map((a) => (a.id === tx.accountId ? { ...a, balance: newBalance } : a))
    );
  };

  const performDeleteSeries = async (tx: Transaction) => {
    if (!tx || !tx.recurrenceRuleId) return;

    setRecurrenceRules((prev) => prev.filter((r) => r.id !== tx.recurrenceRuleId));
    setRecurrenceExceptions((prev) => prev.filter((e) => e.ruleId !== tx.recurrenceRuleId));
    const updatedTransactions = transactions.filter(
      (t) => t.recurrenceRuleId !== tx.recurrenceRuleId
    );
    setTransactions(updatedTransactions);
    setRecurringDeleteTarget(null);

    // Sync deletion
    await supabase.from('transactions').delete().eq('recurrence_rule_id', tx.recurrenceRuleId);
    await supabase.from('recurrence_rules').delete().eq('id', tx.recurrenceRuleId);

    // Update Balance
    const accountTransactions = updatedTransactions.filter((t) => t.accountId === tx.accountId);
    const newBalance = accountTransactions.reduce(
      (acc, t) => (t.type === 'INCOME' ? acc + t.amount : acc - t.amount),
      0
    );
    await supabase.from('accounts').update({ balance: newBalance }).eq('id', tx.accountId);
    setAccounts((prev) =>
      prev.map((a) => (a.id === tx.accountId ? { ...a, balance: newBalance } : a))
    );
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;

    if (tx.isRecurring && tx.recurrenceRuleId) {
      setRecurringDeleteTarget(tx);
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Transacción',
      message:
        '¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.',
      isDestructive: true,
      onConfirm: async () => {
        const updatedTransactions = transactions.filter((t) => t.id !== id);
        setTransactions(updatedTransactions);

        await supabase.from('transactions').delete().eq('id', id);

        // Update Balance
        const accountTransactions = updatedTransactions.filter((t) => t.accountId === tx.accountId);
        const newBalance = accountTransactions.reduce(
          (acc, t) => (t.type === 'INCOME' ? acc + t.amount : acc - t.amount),
          0
        );
        await supabase.from('accounts').update({ balance: newBalance }).eq('id', tx.accountId);
        setAccounts((prev) =>
          prev.map((a) => (a.id === tx.accountId ? { ...a, balance: newBalance } : a))
        );
      },
    });
  };

  const handleAddCategory = async (category: Category) => {
    setCategories((prev) => [...prev, category]);
    await supabase.from('categories').insert({
      id: category.id,
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon,
    });
  };

  const handleDeleteCategory = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Categoría',
      message:
        '¿Seguro que deseas eliminar esta categoría? Si hay transacciones asociadas, aparecerán como "Sin Categoría".',
      isDestructive: true,
      onConfirm: async () => {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        await supabase.from('categories').delete().eq('id', id);
      },
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
    setDateFilter((prev) => ({ ...prev, month: newMonth, year: newYear }));
  };

  const monthName = new Date(dateFilter.year, dateFilter.month).toLocaleString('es-MX', {
    month: 'long',
    year: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-medium text-slate-600 dark:text-slate-400 animate-pulse">
          Sincronizando con Supabase...
        </p>
        <button
          onClick={handleLogout}
          className="mt-8 text-sm text-slate-400 hover:text-rose-500 underline decoration-dotted"
        >
          ¿Atascado? Cerrar sesión y reintentar
        </button>
      </div>
    );
  }

  if (initError && transactions.length === 0 && categories.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Error de Conexión</h2>
        <p className="text-slate-600 mb-8 max-w-md">{initError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // --- AUTH GATE ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Cargando...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

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
            <button
              onClick={() => changeMonth(-1)}
              className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-sm font-medium capitalize w-32 text-center select-none">
              {monthName}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 pt-24 pb-24">
        {/* Period Filter Tabs */}
        {(view === 'DASHBOARD' || view === 'TRANSACTIONS') && (
          <div className="flex justify-center mb-8">
            <div className="bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 inline-flex">
              <button
                onClick={() => setDateFilter((prev) => ({ ...prev, period: PeriodType.Q1 }))}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${dateFilter.period === PeriodType.Q1 ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                1ª Quincena
              </button>
              <button
                onClick={() => setDateFilter((prev) => ({ ...prev, period: PeriodType.Q2 }))}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${dateFilter.period === PeriodType.Q2 ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                2ª Quincena
              </button>
              <button
                onClick={() => setDateFilter((prev) => ({ ...prev, period: 'ALL' }))}
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
              <span className="text-sm text-slate-500">
                {filteredTransactions.length} registros
              </span>
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
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
      />

      <RecurringDeleteModal
        isOpen={!!recurringDeleteTarget}
        onClose={() => setRecurringDeleteTarget(null)}
        onDeleteInstance={() =>
          recurringDeleteTarget && performDeleteInstance(recurringDeleteTarget)
        }
        onDeleteSeries={() => recurringDeleteTarget && performDeleteSeries(recurringDeleteTarget)}
      />
    </div>
  );
};

export default App;

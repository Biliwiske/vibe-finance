import { useState, useEffect, useRef, useCallback } from 'react';
import { Account, Payment, Goal, Purchase, Transaction, Category } from '../types';
import { supabase } from '../lib/supabase';

const FINANCE_DATA_UPDATED_AT_KEY = 'vibe_finance_updated_at';
const FINANCE_DATA_SYNC_USER_KEY = 'vibe_finance_sync_user_id';

type FinanceSnapshot = {
  accounts: Account[];
  transactions: Transaction[];
  payments: Payment[];
  goals: Goal[];
  purchases: Purchase[];
  categories: Category[];
  salary: number;
};

function normalizeFinanceSnapshot(value: unknown): FinanceSnapshot {
  const data = value && typeof value === 'object' ? value as Partial<FinanceSnapshot> : {};
  return {
    accounts: Array.isArray(data.accounts) ? data.accounts : [],
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    payments: Array.isArray(data.payments) ? data.payments : [],
    goals: Array.isArray(data.goals) ? data.goals : [],
    purchases: Array.isArray(data.purchases) ? data.purchases : [],
    categories: Array.isArray(data.categories) ? data.categories : defaultCategories,
    salary: typeof data.salary === 'number' && Number.isFinite(data.salary) ? data.salary : 0,
  };
}

function mergeFinanceSnapshots(local: FinanceSnapshot, remote: FinanceSnapshot): FinanceSnapshot {
  const mergeById = <T extends { id: string }>(localItems: T[], remoteItems: T[]) => {
    const merged = new Map(remoteItems.map(item => [item.id, item]));
    localItems.forEach(item => merged.set(item.id, item));
    return [...merged.values()];
  };

  return {
    accounts: mergeById(local.accounts, remote.accounts),
    transactions: mergeById(local.transactions, remote.transactions),
    payments: mergeById(local.payments, remote.payments),
    goals: mergeById(local.goals, remote.goals),
    purchases: mergeById(local.purchases, remote.purchases),
    categories: mergeById(local.categories, remote.categories),
    salary: local.salary !== 0 ? local.salary : remote.salary,
  };
}

export const defaultCategories: Category[] = [
  // ================= INCOME =================
  { id: '1', name: 'cat_salary', icon: 'Briefcase', type: 'income', color: 'emerald' },
  { id: 'inc_bonus', name: 'cat_bonus', icon: 'Gift', type: 'income', color: 'yellow' },
  { id: 'inc_deposit', name: 'cat_deposit_interest', icon: 'Landmark', type: 'income', color: 'teal' },
  { id: 'inc_savings', name: 'cat_savings_interest', icon: 'PiggyBank', type: 'income', color: 'blue' },
  { id: 'inc_2', name: 'cat_investments', icon: 'Activity', type: 'income', color: 'purple' },
  { id: 'inc_freelance', name: 'cat_freelance', icon: 'Briefcase', type: 'income', color: 'cyan' },
  { id: 'inc_3', name: 'cat_gifts', icon: 'Gift', type: 'income', color: 'pink' },
  { id: 'inc_4', name: 'cat_cashback', icon: 'Box', type: 'income', color: 'green' },
  { id: 'inc_sales', name: 'cat_sales', icon: 'ShoppingBag', type: 'income', color: 'amber' },
  { id: 'inc_5', name: 'cat_other_income', icon: 'Box', type: 'income', color: 'neutral' },
  
  // ================= EXPENSES (PARENTS & SUBCATEGORIES) =================
  // 1. Еда и напитки
  { id: 'exp_food', name: 'cat_food', icon: 'Utensils', type: 'expense', color: 'orange', isParent: true },
  { id: 'exp_supermarkets', name: 'cat_supermarkets', icon: 'ShoppingCart', type: 'expense', color: 'orange', parentId: 'exp_food' },
  { id: 'exp_fastfood', name: 'cat_fastfood', icon: 'UtensilsCrossed', type: 'expense', color: 'amber', parentId: 'exp_food' },
  { id: 'exp_cafe', name: 'cat_cafe', icon: 'Store', type: 'expense', color: 'red', parentId: 'exp_food' },
  { id: 'exp_delivery', name: 'cat_delivery', icon: 'Truck', type: 'expense', color: 'yellow', parentId: 'exp_food' },
  { id: 'exp_coffee', name: 'cat_coffee', icon: 'Coffee', type: 'expense', color: 'pink', parentId: 'exp_food' },

  // 2. Транспорт
  { id: 'exp_transport', name: 'cat_transport_group', icon: 'Car', type: 'expense', color: 'blue', isParent: true },
  { id: 'exp_public_transport', name: 'cat_public_transport', icon: 'Bus', type: 'expense', color: 'blue', parentId: 'exp_transport' },
  { id: 'exp_taxi', name: 'cat_taxi', icon: 'Car', type: 'expense', color: 'yellow', parentId: 'exp_transport' },
  { id: 'exp_fuel', name: 'cat_fuel', icon: 'Flame', type: 'expense', color: 'sky', parentId: 'exp_transport' },
  { id: 'exp_car_service', name: 'cat_car_service', icon: 'Wrench', type: 'expense', color: 'cyan', parentId: 'exp_transport' },
  { id: 'exp_parking', name: 'cat_parking', icon: 'CircleDot', type: 'expense', color: 'neutral', parentId: 'exp_transport' },

  // 3. Жилье и быт
  { id: 'exp_housing', name: 'cat_housing', icon: 'Building', type: 'expense', color: 'purple', isParent: true },
  { id: 'exp_rent', name: 'cat_rent', icon: 'Key', type: 'expense', color: 'purple', parentId: 'exp_housing' },
  { id: 'exp_utilities', name: 'cat_utilities', icon: 'Zap', type: 'expense', color: 'sky', parentId: 'exp_housing' },
  { id: 'exp_home_goods', name: 'cat_home_goods', icon: 'Sofa', type: 'expense', color: 'emerald', parentId: 'exp_housing' },
  { id: 'exp_internet', name: 'cat_internet', icon: 'Wifi', type: 'expense', color: 'teal', parentId: 'exp_housing' },

  // 4. Шопинг и покупки
  { id: 'exp_shopping', name: 'cat_shopping', icon: 'ShoppingBag', type: 'expense', color: 'green', isParent: true },
  { id: 'exp_clothing', name: 'cat_clothing', icon: 'Shirt', type: 'expense', color: 'green', parentId: 'exp_shopping' },
  { id: 'exp_electronics', name: 'cat_electronics', icon: 'Laptop', type: 'expense', color: 'teal', parentId: 'exp_shopping' },
  { id: 'exp_marketplaces', name: 'cat_marketplaces', icon: 'Package', type: 'expense', color: 'purple', parentId: 'exp_shopping' },
  { id: 'exp_selfcare', name: 'cat_selfcare', icon: 'Sparkles', type: 'expense', color: 'pink', parentId: 'exp_shopping' },

  // 5. Здоровье и медицина
  { id: 'exp_health', name: 'cat_health', icon: 'Activity', type: 'expense', color: 'red', isParent: true },
  { id: 'exp_pharmacy', name: 'cat_pharmacy', icon: 'Pill', type: 'expense', color: 'red', parentId: 'exp_health' },
  { id: 'exp_doctors', name: 'cat_doctors', icon: 'Stethoscope', type: 'expense', color: 'pink', parentId: 'exp_health' },
  { id: 'exp_fitness', name: 'cat_fitness', icon: 'Dumbbell', type: 'expense', color: 'emerald', parentId: 'exp_health' },

  // 6. Развлечения и отдых
  { id: 'exp_entertainment', name: 'cat_entertainment', icon: 'Clapperboard', type: 'expense', color: 'purple', isParent: true },
  { id: 'exp_cinema', name: 'cat_cinema', icon: 'Film', type: 'expense', color: 'purple', parentId: 'exp_entertainment' },
  { id: 'exp_subs', name: 'cat_subs', icon: 'Tv', type: 'expense', color: 'blue', parentId: 'exp_entertainment' },
  { id: 'exp_hobbies', name: 'cat_hobbies', icon: 'Gamepad2', type: 'expense', color: 'pink', parentId: 'exp_entertainment' },
  { id: 'exp_travel', name: 'cat_travel', icon: 'Plane', type: 'expense', color: 'sky', parentId: 'exp_entertainment' },

  // 7. Семья и дети
  { id: 'exp_kids', name: 'cat_kids', icon: 'Heart', type: 'expense', color: 'yellow', isParent: true },
  { id: 'exp_kids_goods', name: 'cat_kids_goods', icon: 'Gift', type: 'expense', color: 'yellow', parentId: 'exp_kids' },
  { id: 'exp_education', name: 'cat_education', icon: 'GraduationCap', type: 'expense', color: 'teal', parentId: 'exp_kids' },
  { id: 'exp_pets', name: 'cat_pets', icon: 'PawPrint', type: 'expense', color: 'amber', parentId: 'exp_kids' },

  // 8. Платежи и финансы
  { id: 'exp_payments', name: 'cat_payments', icon: 'Landmark', type: 'expense', color: 'neutral', isParent: true },
  { id: 'exp_loans', name: 'cat_loans', icon: 'Percent', type: 'expense', color: 'red', parentId: 'exp_payments' },
  { id: 'exp_presents', name: 'cat_presents', icon: 'Gift', type: 'expense', color: 'green', parentId: 'exp_payments' },
  { id: 'exp_other', name: 'cat_other_expenses', icon: 'Box', type: 'expense', color: 'neutral', parentId: 'exp_payments' }
];

export function useFinanceStore(userId: string | null = null) {
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('vibe_categories');
    if (saved) {
      let parsed: Category[] = JSON.parse(saved);
      // Sync distinct icons with defaults
      parsed = parsed.map(c => {
        const def = defaultCategories.find(d => d.id === c.id);
        if (def && def.icon !== c.icon) {
          return { ...c, icon: def.icon };
        }
        return c;
      });

      // Check if user has legacy flat categories and needs migration
      const hasSubcategories = parsed.some(c => !!c.parentId || c.id === 'exp_supermarkets');
      if (!hasSubcategories || parsed.length <= 16) {
        // Merge custom categories from user with new hierarchical defaults
        const customUserCategories = parsed.filter(c => 
          !defaultCategories.some(d => d.id === c.id || d.name === c.name) &&
          !['2', '3', '4', 'exp_2', 'exp_4', 'exp_6', 'exp_7', 'exp_8', 'exp_9', 'exp_10', 'exp_11', 'exp_12', 'exp_13', 'exp_14', 'exp_15', 'exp_16'].includes(c.id)
        );
        return [...defaultCategories, ...customUserCategories];
      }
      
      // Ensure all default categories/subcategories exist
      const missingDefaults = defaultCategories.filter(def => 
        !parsed.some(c => c.id === def.id || (c.name === def.name && c.parentId === def.parentId))
      );
      if (missingDefaults.length > 0) {
        return [...parsed, ...missingDefaults];
      }

      return parsed;
    }
    return defaultCategories;
  });
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('vibe_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [salary, setSalary] = useState<number>(() => {
    const saved = localStorage.getItem('vibe_salary');
    return saved ? parseFloat(saved) : 0;
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('vibe_accounts');
    return saved ? JSON.parse(saved) : [];
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('vibe_payments');
    return saved ? JSON.parse(saved) : [];
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('vibe_goals');
    return saved ? JSON.parse(saved) : [];
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem('vibe_purchases');
    return saved ? JSON.parse(saved) : [];
  });

  const financeSnapshot: FinanceSnapshot = {
    accounts,
    transactions,
    payments,
    goals,
    purchases,
    categories,
    salary,
  };
  const financeSnapshotRef = useRef(financeSnapshot);
  financeSnapshotRef.current = financeSnapshot;
  const financeSignature = JSON.stringify(financeSnapshot);
  const previousLocalSignatureRef = useRef(financeSignature);
  const pendingRemoteTimestampRef = useRef<string | null>(null);
  const lastSyncedSignatureRef = useRef<string | null>(null);
  const [syncReady, setSyncReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'local' | 'loading' | 'saving' | 'synced' | 'error'>('local');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncRetry, setSyncRetry] = useState(0);
  const storedSyncUserId = localStorage.getItem(FINANCE_DATA_SYNC_USER_KEY);
  const isForeignLocalData = Boolean(userId && storedSyncUserId && storedSyncUserId !== userId);

  useEffect(() => {
    localStorage.setItem('vibe_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('vibe_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('vibe_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('vibe_purchases', JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem('vibe_payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('vibe_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('vibe_salary', salary.toString());
  }, [salary]);

  useEffect(() => {
    if (financeSignature === previousLocalSignatureRef.current) return;
    previousLocalSignatureRef.current = financeSignature;
    const remoteTimestamp = pendingRemoteTimestampRef.current;
    pendingRemoteTimestampRef.current = null;
    localStorage.setItem(
      FINANCE_DATA_UPDATED_AT_KEY,
      remoteTimestamp || new Date().toISOString(),
    );
  }, [financeSignature]);

  const applyFinanceSnapshot = useCallback((value: unknown, remoteTimestamp?: string) => {
    const snapshot = normalizeFinanceSnapshot(value);
    pendingRemoteTimestampRef.current = remoteTimestamp || null;
    if (remoteTimestamp) {
      localStorage.setItem(FINANCE_DATA_UPDATED_AT_KEY, remoteTimestamp);
    }
    setAccounts(snapshot.accounts);
    setTransactions(snapshot.transactions);
    setPayments(snapshot.payments);
    setGoals(snapshot.goals);
    setPurchases(snapshot.purchases);
    setCategories(snapshot.categories);
    setSalary(snapshot.salary);
  }, []);

  useEffect(() => {
    if (!userId || !supabase) {
      setSyncReady(false);
      setSyncStatus('local');
      setSyncError(null);
      return;
    }

    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    setSyncReady(false);
    setSyncStatus('loading');
    setSyncError(null);

    const loadFinanceData = async () => {
      const { data: remoteRecord, error } = await supabase
        .from('finance_data')
        .select('data, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!active) return;

      const localOwner = localStorage.getItem(FINANCE_DATA_SYNC_USER_KEY);
      const canUseLocalData = !localOwner || localOwner === userId;
      const localSnapshot = canUseLocalData
        ? financeSnapshotRef.current
        : {
            accounts: [],
            transactions: [],
            payments: [],
            goals: [],
            purchases: [],
            categories: defaultCategories,
            salary: 0,
          };
      const localTimestamp = canUseLocalData
        ? localStorage.getItem(FINANCE_DATA_UPDATED_AT_KEY)
        : null;
      const remoteSnapshot = remoteRecord ? normalizeFinanceSnapshot(remoteRecord.data) : null;
      const remoteTimestamp = remoteRecord?.updated_at || null;
      let resolvedSnapshot = localSnapshot;
      let remoteIsLatest = false;

      if (remoteSnapshot && remoteTimestamp && localTimestamp) {
        remoteIsLatest = Date.parse(remoteTimestamp) >= Date.parse(localTimestamp);
        resolvedSnapshot = remoteIsLatest ? remoteSnapshot : localSnapshot;
      } else if (remoteSnapshot) {
        remoteIsLatest = !canUseLocalData;
        resolvedSnapshot = canUseLocalData
          ? mergeFinanceSnapshots(localSnapshot, remoteSnapshot)
          : remoteSnapshot;
      }

      lastSyncedSignatureRef.current = remoteSnapshot ? JSON.stringify(remoteSnapshot) : null;
      localStorage.setItem(FINANCE_DATA_SYNC_USER_KEY, userId);
      applyFinanceSnapshot(
        resolvedSnapshot,
        remoteIsLatest ? remoteTimestamp || undefined : undefined,
      );
      if (remoteIsLatest && remoteTimestamp) {
        localStorage.setItem(FINANCE_DATA_UPDATED_AT_KEY, remoteTimestamp);
      }
      setSyncReady(true);
      setSyncStatus(remoteIsLatest ? 'synced' : 'saving');

      channel = supabase
        .channel(`finance_data:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'finance_data',
            filter: `user_id=eq.${userId}`,
          },
          payload => {
            if (!active || payload.eventType === 'DELETE') return;
            const record = payload.new as { data?: unknown; updated_at?: string };
            if (!record.data || !record.updated_at) return;

            const currentTimestamp = localStorage.getItem(FINANCE_DATA_UPDATED_AT_KEY);
            if (currentTimestamp && Date.parse(record.updated_at) <= Date.parse(currentTimestamp)) return;

            const remoteData = normalizeFinanceSnapshot(record.data);
            lastSyncedSignatureRef.current = JSON.stringify(remoteData);
            applyFinanceSnapshot(remoteData, record.updated_at);
            setSyncStatus('synced');
            setSyncError(null);
          },
        )
        .subscribe(status => {
          if (active && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) {
            setSyncStatus('error');
            setSyncError('Realtime sync is unavailable. Check the finance_data table publication and connection.');
          }
        });
    };

    loadFinanceData().catch(error => {
      if (!active) return;
      setSyncStatus('error');
      setSyncError(error instanceof Error ? error.message : String(error));
    });

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, syncRetry, applyFinanceSnapshot]);

  useEffect(() => {
    if (!userId || !supabase || !syncReady) return;
    if (financeSignature === lastSyncedSignatureRef.current) return;

    let active = true;
    const snapshotToSave = financeSnapshot;
    const signatureToSave = financeSignature;
    const timeoutId = window.setTimeout(async () => {
      setSyncStatus('saving');
      setSyncError(null);

      try {
        const { data: remoteRecord, error: readError } = await supabase
          .from('finance_data')
          .select('data, updated_at')
          .eq('user_id', userId)
          .maybeSingle();
        if (readError) throw readError;
        if (!active) return;

        const localTimestamp = localStorage.getItem(FINANCE_DATA_UPDATED_AT_KEY);
        if (
          remoteRecord?.updated_at &&
          localTimestamp &&
          Date.parse(remoteRecord.updated_at) > Date.parse(localTimestamp)
        ) {
          const remoteSnapshot = normalizeFinanceSnapshot(remoteRecord.data);
          lastSyncedSignatureRef.current = JSON.stringify(remoteSnapshot);
          applyFinanceSnapshot(remoteSnapshot, remoteRecord.updated_at);
          setSyncStatus('synced');
          return;
        }

        const updatedAt = new Date().toISOString();
        const { data: saved, error: saveError } = await supabase.rpc('save_finance_data', {
          p_data: snapshotToSave,
          p_updated_at: updatedAt,
        });
        if (saveError) throw saveError;
        if (!active) return;

        if (!saved) {
          const { data: latestRecord, error: latestError } = await supabase
            .from('finance_data')
            .select('data, updated_at')
            .eq('user_id', userId)
            .maybeSingle();
          if (latestError) throw latestError;
          if (!latestRecord) throw new Error('Supabase rejected the finance data update without a newer row.');
          if (!active) return;

          const latestSnapshot = normalizeFinanceSnapshot(latestRecord.data);
          lastSyncedSignatureRef.current = JSON.stringify(latestSnapshot);
          applyFinanceSnapshot(latestSnapshot, latestRecord.updated_at);
          setSyncStatus('synced');
          return;
        }

        localStorage.setItem(FINANCE_DATA_UPDATED_AT_KEY, updatedAt);
        lastSyncedSignatureRef.current = signatureToSave;
        setSyncStatus('synced');
      } catch (error) {
        if (!active) return;
        setSyncStatus('error');
        setSyncError(error instanceof Error ? error.message : String(error));
      }
    }, 2000);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [
    userId,
    syncReady,
    financeSignature,
    accounts,
    transactions,
    payments,
    goals,
    purchases,
    categories,
    salary,
    applyFinanceSnapshot,
  ]);

  const addAccount = (account: Omit<Account, 'id'>) => {
    setAccounts([...accounts, { ...account, id: crypto.randomUUID() }]);
  };

  const editAccount = (id: string, updatedAccount: Omit<Account, 'id'>) => {
    setAccounts(accounts.map(a => a.id === id ? { ...a, ...updatedAccount } : a));
  };

  const removeAccount = (id: string) => {
    setAccounts(accounts.filter(a => a.id !== id));
  };

  const addPayment = (payment: Omit<Payment, 'id'>) => {
    setPayments([...payments, { ...payment, id: crypto.randomUUID() }]);
  };

  const editPayment = (id: string, updatedPayment: Omit<Payment, 'id'>) => {
    setPayments(payments.map(p => p.id === id ? { ...p, ...updatedPayment } : p));
  };

  const removePayment = (id: string) => {
    setPayments(payments.filter(p => p.id !== id));
  };

  const togglePaymentActive = (id: string) => {
    setPayments(payments.map(p => 
      p.id === id ? { ...p, isActive: !p.isActive } : p
    ));
  };

  const addGoal = (goal: Omit<Goal, 'id'>) => {
    setGoals([...goals, { ...goal, id: crypto.randomUUID() }]);
  };

  const editGoal = (id: string, updatedGoal: Omit<Goal, 'id'>) => {
    setGoals(goals.map(g => g.id === id ? { ...g, ...updatedGoal } : g));
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const addPurchase = (purchase: Omit<Purchase, 'id'>) => {
    setPurchases([...purchases, { ...purchase, id: crypto.randomUUID() }]);
  };

  const editPurchase = (id: string, updatedPurchase: Omit<Purchase, 'id'>) => {
    setPurchases(purchases.map(p => p.id === id ? { ...p, ...updatedPurchase } : p));
  };

  const removePurchase = (id: string) => {
    setPurchases(purchases.filter(p => p.id !== id));
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    setTransactions([...transactions, { ...transaction, id: crypto.randomUUID() }]);
    if (!transaction.skipBalanceUpdate) {
      setAccounts(accounts.map(acc => {
        if (acc.id === transaction.accountId) {
          return { 
            ...acc, 
            balance: transaction.type === 'income' ? acc.balance + transaction.amount : acc.balance - transaction.amount 
          };
        }
        return acc;
      }));
    }
  };

  const editTransaction = (id: string, updatedTransaction: Omit<Transaction, 'id'>) => {
    const oldTx = transactions.find(t => t.id === id);
    setTransactions(transactions.map(t => t.id === id ? { ...updatedTransaction, id } : t));
    
    // Revert old effect and apply new effect on accounts
    setAccounts(accounts.map(acc => {
      let balance = acc.balance;
      if (oldTx && !oldTx.skipBalanceUpdate && oldTx.accountId === acc.id) {
        balance = oldTx.type === 'income' ? balance - oldTx.amount : balance + oldTx.amount;
      }
      if (!updatedTransaction.skipBalanceUpdate && updatedTransaction.accountId === acc.id) {
        balance = updatedTransaction.type === 'income' ? balance + updatedTransaction.amount : balance - updatedTransaction.amount;
      }
      return balance !== acc.balance ? { ...acc, balance } : acc;
    }));
  };

  const removeTransaction = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      setTransactions(transactions.filter(t => t.id !== id));
      if (!transaction.skipBalanceUpdate) {
        setAccounts(accounts.map(acc => {
          if (acc.id === transaction.accountId) {
            return { 
              ...acc, 
              balance: transaction.type === 'income' ? acc.balance - transaction.amount : acc.balance + transaction.amount 
            };
          }
          return acc;
        }));
      }
    }
  };

  const addCategory = (category: Omit<Category, 'id'>) => {
    setCategories([...categories, { ...category, id: crypto.randomUUID() }]);
  };

  const importFinanceData = (payload: {
    accounts?: Account[];
    transactions?: Transaction[];
    payments?: Payment[];
    goals?: Goal[];
    purchases?: Purchase[];
    categories?: Category[];
    salary?: number;
    mode: 'merge' | 'replace';
    skipBalanceUpdate?: boolean;
  }) => {
    const { mode, skipBalanceUpdate = false } = payload;
    let nextAccounts = [...accounts];
    let nextCategories = [...categories];
    let nextPayments = [...payments];
    let nextGoals = [...goals];
    let nextPurchases = [...purchases];
    let nextTransactions = [...transactions];

    const stats = {
      accounts: 0,
      transactions: 0,
      payments: 0,
      goals: 0,
      purchases: 0,
      categories: 0
    };

    // 1. Categories
    if (payload.categories && payload.categories.length > 0) {
      if (mode === 'replace') {
        nextCategories = payload.categories;
        stats.categories = payload.categories.length;
      } else {
        payload.categories.forEach(cat => {
          if (!nextCategories.some(c => c.id === cat.id || (c.name.toLowerCase() === cat.name.toLowerCase() && c.parentId === cat.parentId))) {
            nextCategories.push({ ...cat, id: cat.id || crypto.randomUUID() });
            stats.categories++;
          }
        });
      }
      setCategories(nextCategories);
    }

    // 2. Accounts
    if (payload.accounts && payload.accounts.length > 0) {
      if (mode === 'replace') {
        nextAccounts = payload.accounts;
        stats.accounts = payload.accounts.length;
      } else {
        payload.accounts.forEach(acc => {
          const existingIdx = nextAccounts.findIndex(a => 
            a.name.toLowerCase().trim() === acc.name.toLowerCase().trim() || a.id === acc.id
          );
          if (existingIdx >= 0) {
            nextAccounts[existingIdx] = { ...nextAccounts[existingIdx], ...acc, id: nextAccounts[existingIdx].id };
          } else {
            nextAccounts.push({ ...acc, id: acc.id || crypto.randomUUID() });
            stats.accounts++;
          }
        });
      }
      setAccounts(nextAccounts);
    }

    // 3. Payments
    if (payload.payments && payload.payments.length > 0) {
      if (mode === 'replace') {
        nextPayments = payload.payments;
        stats.payments = payload.payments.length;
      } else {
        payload.payments.forEach(p => {
          const existingIdx = nextPayments.findIndex(item => 
            item.name.toLowerCase().trim() === p.name.toLowerCase().trim() || item.id === p.id
          );
          if (existingIdx >= 0) {
            nextPayments[existingIdx] = { ...nextPayments[existingIdx], ...p, id: nextPayments[existingIdx].id };
          } else {
            nextPayments.push({ ...p, id: p.id || crypto.randomUUID() });
            stats.payments++;
          }
        });
      }
      setPayments(nextPayments);
    }

    // 4. Goals
    if (payload.goals && payload.goals.length > 0) {
      if (mode === 'replace') {
        nextGoals = payload.goals;
        stats.goals = payload.goals.length;
      } else {
        payload.goals.forEach(g => {
          const existingIdx = nextGoals.findIndex(item => 
            item.name.toLowerCase().trim() === g.name.toLowerCase().trim() || item.id === g.id
          );
          if (existingIdx >= 0) {
            nextGoals[existingIdx] = { ...nextGoals[existingIdx], ...g, id: nextGoals[existingIdx].id };
          } else {
            nextGoals.push({ ...g, id: g.id || crypto.randomUUID() });
            stats.goals++;
          }
        });
      }
      setGoals(nextGoals);
    }

    // 5. Purchases
    if (payload.purchases && payload.purchases.length > 0) {
      if (mode === 'replace') {
        nextPurchases = payload.purchases;
        stats.purchases = payload.purchases.length;
      } else {
        payload.purchases.forEach(pr => {
          const existingIdx = nextPurchases.findIndex(item => 
            item.name.toLowerCase().trim() === pr.name.toLowerCase().trim() || item.id === pr.id
          );
          if (existingIdx >= 0) {
            nextPurchases[existingIdx] = { ...nextPurchases[existingIdx], ...pr, id: nextPurchases[existingIdx].id };
          } else {
            nextPurchases.push({ ...pr, id: pr.id || crypto.randomUUID() });
            stats.purchases++;
          }
        });
      }
      setPurchases(nextPurchases);
    }

    // 6. Salary
    if (payload.salary !== undefined && payload.salary > 0) {
      setSalary(payload.salary);
    }

    // 7. Transactions
    if (payload.transactions && payload.transactions.length > 0) {
      const txsToApply = payload.transactions.map(t => ({
        ...t,
        id: t.id || crypto.randomUUID(),
        skipBalanceUpdate: skipBalanceUpdate || t.skipBalanceUpdate
      }));

      if (mode === 'replace') {
        nextTransactions = txsToApply;
        stats.transactions = txsToApply.length;
      } else {
        // In merge mode, prevent identical duplicate transactions
        txsToApply.forEach(tx => {
          const isDuplicate = nextTransactions.some(existing => 
            existing.date === tx.date &&
            Math.abs(existing.amount - tx.amount) < 0.001 &&
            existing.type === tx.type &&
            (existing.note || '').trim() === (tx.note || '').trim() &&
            existing.accountId === tx.accountId
          );
          if (!isDuplicate) {
            nextTransactions.push(tx);
            stats.transactions++;
          }
        });
      }
      setTransactions(nextTransactions);

      // If user wants balance updated and it's not replace mode with new accounts
      if (!skipBalanceUpdate && mode !== 'replace') {
        let updatedAccs = [...nextAccounts];
        txsToApply.forEach(tx => {
          if (!tx.skipBalanceUpdate && tx.accountId) {
            updatedAccs = updatedAccs.map(acc => {
              if (acc.id === tx.accountId) {
                return {
                  ...acc,
                  balance: tx.type === 'income' ? acc.balance + tx.amount : acc.balance - tx.amount
                };
              }
              return acc;
            });
          }
        });
        nextAccounts = updatedAccs;
        setAccounts(nextAccounts);
      }
    }

    return stats;
  };

  const resetFinanceData = (options?: {
    resetAccounts?: boolean;
    resetTransactions?: boolean;
    resetPayments?: boolean;
    resetGoals?: boolean;
    resetPurchases?: boolean;
    resetSalary?: boolean;
    resetCategories?: boolean;
  }) => {
    const opts = {
      resetAccounts: true,
      resetTransactions: true,
      resetPayments: true,
      resetGoals: true,
      resetPurchases: true,
      resetSalary: false,
      resetCategories: false,
      ...options
    };

    if (opts.resetAccounts) {
      setAccounts([]);
      try { localStorage.removeItem('vibe_accounts'); } catch {}
    }
    if (opts.resetTransactions) {
      setTransactions([]);
      try { localStorage.removeItem('vibe_transactions'); } catch {}
    }
    if (opts.resetPayments) {
      setPayments([]);
      try { localStorage.removeItem('vibe_payments'); } catch {}
    }
    if (opts.resetGoals) {
      setGoals([]);
      try { localStorage.removeItem('vibe_goals'); } catch {}
    }
    if (opts.resetPurchases) {
      setPurchases([]);
      try { localStorage.removeItem('vibe_purchases'); } catch {}
    }
    if (opts.resetSalary) {
      setSalary(0);
      try { localStorage.removeItem('vibe_salary'); } catch {}
    }
    if (opts.resetCategories) {
      setCategories(defaultCategories);
      try { localStorage.removeItem('vibe_categories'); } catch {}
    }
  };

  return {
    salary, setSalary,
    accounts, setAccounts, addAccount, editAccount, removeAccount,
    payments, setPayments, addPayment, editPayment, removePayment, togglePaymentActive,
    goals, setGoals, addGoal, editGoal, removeGoal,
    purchases, setPurchases, addPurchase, editPurchase, removePurchase,
    transactions, setTransactions, addTransaction, editTransaction, removeTransaction,
    categories, setCategories, addCategory,
    importFinanceData,
    resetFinanceData,
    syncStatus,
    syncError,
    isForeignLocalData,
    retrySync: () => setSyncRetry(value => value + 1),
  };
}

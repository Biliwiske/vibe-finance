const fs = require('fs');
let content = fs.readFileSync('src/hooks/useFinanceStore.ts', 'utf8');

// I need to cleanly rewrite the return block instead of string replacing.
// First let's remove the broken const removePurchase.

// I'll just check out the file from git or manually write it. Wait, no git here.
// Let's just output the whole correct file.
const correctStore = `import { useState, useEffect } from 'react';
import { Account, Payment, Goal, Purchase, Transaction, Category } from '../types';

export function useFinanceStore() {
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('vibe_categories');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'Salary', icon: 'Briefcase', type: 'income' },
      { id: '2', name: 'Food', icon: 'ShoppingBag', type: 'expense' },
      { id: '3', name: 'Transport', icon: 'Car', type: 'expense' },
      { id: '4', name: 'Housing', icon: 'Home', type: 'expense' }
    ];
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
    setAccounts(accounts.map(acc => {
      if (acc.id === transaction.accountId) {
        return { 
          ...acc, 
          balance: transaction.type === 'income' ? acc.balance + transaction.amount : acc.balance - transaction.amount 
        };
      }
      return acc;
    }));
  };

  const removeTransaction = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      setTransactions(transactions.filter(t => t.id !== id));
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
  };

  const addCategory = (category: Omit<Category, 'id'>) => {
    setCategories([...categories, { ...category, id: crypto.randomUUID() }]);
  };

  return {
    salary, setSalary,
    accounts, addAccount, editAccount, removeAccount,
    payments, addPayment, editPayment, removePayment, togglePaymentActive,
    goals, addGoal, editGoal, removeGoal,
    purchases, addPurchase, editPurchase, removePurchase,
    transactions, addTransaction, removeTransaction,
    categories, addCategory
  };
}
`;

fs.writeFileSync('src/hooks/useFinanceStore.ts', correctStore);

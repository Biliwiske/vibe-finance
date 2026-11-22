export type AccountType = 'checking' | 'credit' | 'savings' | 'deposit' | 'cash' | 'crypto' | 'debt';
export type CurrencyCode = 'USD' | 'EUR' | 'RUB' | 'GBP';
export type Recurrence = 'none' | 'weekly' | 'monthly' | 'yearly';

export type Account = {
  id: string;
  name: string;
  balance: number;
  creditLimit?: number; // Maximum limit for credit cards
  gracePeriodDays?: number; // Interest-free days (e.g. 100 days)
  type?: AccountType;
  bank?: string;
  interestRate?: number;
};

export type Payment = {
  id: string;
  name: string;
  amount: number;
  date?: string; // YYYY-MM-DD
  isActive: boolean;
  recurrence?: Recurrence;
  isFlexible?: boolean;
  accountId?: string;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  monthlyContribution: number;
  savedAmount: number;
};

export type Purchase = {
  id: string;
  name: string;
  amount: number;
};


export type TransactionType = 'income' | 'expense';

export type Category = {
  id: string;
  name: string;
  icon: string;
  color?: string;
  type: TransactionType;
  parentId?: string | null;
  isParent?: boolean;
};

export type Transaction = {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  date: string;
  note?: string;
  recurrence?: Recurrence;
  isRecurring?: boolean;
  skipBalanceUpdate?: boolean; // When true, does not change account balance (historical log)
};

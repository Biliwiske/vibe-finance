import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, Copy, Check, X, FileSpreadsheet,
  Table, ShieldCheck, Wallet, PiggyBank, CalendarDays,
  Eye, FileText, CheckCircle2, Database, ExternalLink,
  ArrowUpDown, ArrowDownWideNarrow, ArrowUpNarrowWide,
  Package, Search, Info
} from 'lucide-react';
import { Account, Payment, Goal, Purchase, Transaction, Category } from './types';
import { formatMoney } from './utils';
import { getCategoryMeta, FULL_BANKS } from './TransactionForms';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  payments: Payment[];
  goals: Goal[];
  purchases: Purchase[];
  transactions: Transaction[];
  categories: Category[];
  salary: number;
  currency: string;
  lang: string;
  t: (key: string) => string;
  initialTable?: 'transactions' | 'accounts' | 'payments' | 'goals_purchases' | 'full_report' | 'json_backup';
}

// Reliable date parser that returns a normalized timestamp at noon local time
const parseTxTimestamp = (dateStr?: string): number => {
  if (!dateStr) return 0;
  const s = String(dateStr).trim();
  // Format: DD.MM.YYYY
  if (/^\d{1,2}\.\d{1,2}\.\d{4}/.test(s)) {
    const parts = s.split('.');
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    return new Date(y, m, d, 12, 0, 0).getTime();
  }
  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const parts = s.substring(0, 10).split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d, 12, 0, 0).getTime();
  }
  const parsed = new Date(s).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

export function ExportModal({
  isOpen,
  onClose,
  accounts,
  payments,
  goals,
  purchases,
  transactions,
  categories,
  salary,
  currency,
  lang,
  t,
  initialTable = 'transactions'
}: ExportModalProps) {
  const [selectedTable, setSelectedTable] = useState<'transactions' | 'accounts' | 'payments' | 'goals_purchases' | 'full_report' | 'json_backup'>(initialTable);
  const [delimiter, setDelimiter] = useState<';' | ','>(lang === 'ru' ? ';' : ',');
  const [decimalSep, setDecimalSep] = useState<',' | '.'>(lang === 'ru' ? ',' : '.');
  const [includeHeader, setIncludeHeader] = useState(true);
  
  // Sorting and period controls
  const [txPeriod, setTxPeriod] = useState<'all' | 'this_month' | 'last_month' | 'this_year'>('all');
  const [txSortOrder, setTxSortOrder] = useState<'desc' | 'asc'>('desc'); // desc = newest first
  const [fullReportPeriod, setFullReportPeriod] = useState<'all' | 'last_12_months' | 'last_6_months' | 'last_3_months' | 'this_month'>('all');
  
  // Full report sub-preview tabs
  const [fullReportPreviewTab, setFullReportPreviewTab] = useState<'transactions' | 'accounts' | 'payments' | 'goals_purchases' | 'raw_csv'>('transactions');
  const [searchFilter, setSearchFilter] = useState('');
  
  // Feedback states
  const [copied, setCopied] = useState(false);
  const [copiedCsv, setCopiedCsv] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showRawCode, setShowRawCode] = useState(false);
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [downloadPageUrl, setDownloadPageUrl] = useState<string | null>(null);

  // Sync initialTable on open
  React.useEffect(() => {
    if (isOpen) {
      setSelectedTable(initialTable);
    }
  }, [isOpen, initialTable]);

  // Current calendar boundaries
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Helper for bank names
  const getBankName = (bankId?: string) => {
    if (!bankId || bankId === 'none') return lang === 'ru' ? 'Наличные / Другой' : 'Cash / Other';
    const b = FULL_BANKS.find(x => x.id === bankId);
    return b ? b.name : bankId;
  };

  // Helper for account type names
  const getAccountTypeName = (type?: string) => {
    const map: Record<string, { ru: string; en: string }> = {
      checking: { ru: 'Дебетовая карта / Счёт', en: 'Checking / Debit' },
      credit: { ru: 'Кредитная карта', en: 'Credit Card' },
      savings: { ru: 'Накопительный счёт', en: 'Savings' },
      deposit: { ru: 'Банковский вклад', en: 'Term Deposit' },
      cash: { ru: 'Наличные', en: 'Cash' },
      crypto: { ru: 'Криптовалюта', en: 'Crypto' },
      debt: { ru: 'Кредит / Займ', en: 'Loan / Debt' }
    };
    if (!type || !map[type]) return lang === 'ru' ? 'Счёт' : 'Account';
    return lang === 'ru' ? map[type].ru : map[type].en;
  };

  // Format numeric values for CSV based on decimal separator
  const formatNumberForCsv = (val: number | undefined | null): string => {
    if (val === undefined || val === null || isNaN(val)) return '';
    const fixed = val.toFixed(2);
    if (decimalSep === ',') {
      return fixed.replace('.', ',');
    }
    return fixed;
  };

  // Safe CSV field escaping
  const escapeCsv = (str: string | number | undefined | null): string => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  // 1. Transactions filtered and sorted for the standalone "Transactions" tab
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const time = parseTxTimestamp(tx.date);
      const d = new Date(time);
      if (txPeriod === 'this_month') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      if (txPeriod === 'last_month') {
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        return d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() === lastMonthDate.getMonth();
      }
      if (txPeriod === 'this_year') {
        return d.getFullYear() === currentYear;
      }
      return true;
    }).sort((a, b) => {
      const diff = parseTxTimestamp(b.date) - parseTxTimestamp(a.date);
      if (diff !== 0) return txSortOrder === 'desc' ? diff : -diff;
      return (b.amount || 0) - (a.amount || 0);
    });
  }, [transactions, txPeriod, txSortOrder, currentYear, currentMonth]);

  // 2. Transactions filtered and sorted for the "Full Report" tab (Default: 100% of all transactions)
  const fullReportTransactions = useMemo(() => {
    const nowTime = now.getTime();
    return transactions.filter(tx => {
      if (fullReportPeriod === 'all') return true;
      const time = parseTxTimestamp(tx.date);
      const d = new Date(time);
      if (fullReportPeriod === 'this_month') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      if (fullReportPeriod === 'last_3_months') {
        const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1).getTime();
        return time >= threeMonthsAgo;
      }
      if (fullReportPeriod === 'last_6_months') {
        const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1).getTime();
        return time >= sixMonthsAgo;
      }
      if (fullReportPeriod === 'last_12_months') {
        const twelveMonthsAgo = new Date(currentYear, currentMonth - 11, 1).getTime();
        return time >= twelveMonthsAgo;
      }
      return true;
    }).sort((a, b) => {
      // Strict chronological sorting
      const diff = parseTxTimestamp(b.date) - parseTxTimestamp(a.date);
      if (diff !== 0) return txSortOrder === 'desc' ? diff : -diff;
      return (b.amount || 0) - (a.amount || 0);
    });
  }, [transactions, fullReportPeriod, txSortOrder, currentYear, currentMonth, now]);

  // Date range and monthly distribution calculation (guarantees verification of recent months)
  const txDateStats = useMemo(() => {
    if (transactions.length === 0) {
      return { minDate: '—', maxDate: '—', recentMonths: [] };
    }
    const timestamps = transactions.map(t => parseTxTimestamp(t.date)).filter(t => t > 0);
    if (timestamps.length === 0) {
      return { minDate: '—', maxDate: '—', recentMonths: [] };
    }
    const minT = Math.min(...timestamps);
    const maxT = Math.max(...timestamps);
    const minDate = new Date(minT).toISOString().split('T')[0];
    const maxDate = new Date(maxT).toISOString().split('T')[0];

    // Count operations for last 6 calendar months to provide direct visual assurance
    const recentMonths: Array<{ label: string; count: number; year: number; month: number }> = [];
    for (let i = 0; i < 6; i++) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const count = transactions.filter(t => {
        const td = new Date(parseTxTimestamp(t.date));
        return td.getFullYear() === y && td.getMonth() === m;
      }).length;

      const monthName = targetDate.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' });
      recentMonths.push({
        label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        count,
        year: y,
        month: m
      });
    }

    return { minDate, maxDate, recentMonths };
  }, [transactions, currentYear, currentMonth, lang]);

  // Build CSV string
  const generateCsvContent = (): string => {
    const d = delimiter;
    const lines: string[] = [];

    // ==========================================
    // 1. TRANSACTIONS ONLY TABLE
    // ==========================================
    if (selectedTable === 'transactions') {
      if (includeHeader) {
        lines.push([
          lang === 'ru' ? 'Дата' : 'Date',
          lang === 'ru' ? 'Тип операции' : 'Type',
          lang === 'ru' ? 'Сумма' : 'Amount',
          lang === 'ru' ? 'Валюта' : 'Currency',
          lang === 'ru' ? 'Основная категория' : 'Main Category',
          lang === 'ru' ? 'Подкатегория' : 'Subcategory',
          lang === 'ru' ? 'Счёт' : 'Account',
          lang === 'ru' ? 'Банк' : 'Bank',
          lang === 'ru' ? 'Тип счёта' : 'Account Type',
          lang === 'ru' ? 'Комментарий' : 'Note',
          lang === 'ru' ? 'Регулярность' : 'Recurrence',
          lang === 'ru' ? 'Учёт в балансе' : 'Balance Tracking'
        ].map(escapeCsv).join(d));
      }

      filteredTransactions.forEach(tx => {
        const catMeta = getCategoryMeta(categories, tx.categoryId, t);
        const acc = accounts.find(a => a.id === tx.accountId);
        const mainCat = catMeta.parentName || catMeta.name;
        const subCat = catMeta.parentName ? catMeta.name : '';
        const typeLabel = tx.type === 'income' ? (lang === 'ru' ? 'Доход' : 'Income') : (lang === 'ru' ? 'Расход' : 'Expense');
        const trackingLabel = tx.skipBalanceUpdate 
          ? (lang === 'ru' ? 'Архивная (без списания)' : 'Archived (no balance change)')
          : (lang === 'ru' ? 'Учтено в балансе' : 'Normal (updated balance)');
        
        let recLabel = lang === 'ru' ? 'Разовая' : 'One-time';
        if (tx.recurrence === 'weekly') recLabel = lang === 'ru' ? 'Еженедельно' : 'Weekly';
        else if (tx.recurrence === 'monthly') recLabel = lang === 'ru' ? 'Ежемесячно' : 'Monthly';
        else if (tx.recurrence === 'yearly') recLabel = lang === 'ru' ? 'Ежегодно' : 'Yearly';

        lines.push([
          tx.date,
          typeLabel,
          formatNumberForCsv(tx.amount),
          currency,
          mainCat,
          subCat,
          acc ? acc.name : (lang === 'ru' ? 'Не указан' : 'None'),
          acc ? getBankName(acc.bank) : '',
          acc ? getAccountTypeName(acc.type) : '',
          tx.note || '',
          recLabel,
          trackingLabel
        ].map(escapeCsv).join(d));
      });
    }

    // ==========================================
    // 2. ACCOUNTS ONLY TABLE
    // ==========================================
    else if (selectedTable === 'accounts') {
      if (includeHeader) {
        lines.push([
          lang === 'ru' ? 'Название счёта' : 'Account Name',
          lang === 'ru' ? 'Банк' : 'Bank',
          lang === 'ru' ? 'Тип счёта' : 'Account Type',
          lang === 'ru' ? 'Текущий баланс / Доступно' : 'Current Balance / Available',
          lang === 'ru' ? 'Кредитный лимит' : 'Credit Limit',
          lang === 'ru' ? 'Фактически потрачено (долг)' : 'Actual Spent (Debt)',
          lang === 'ru' ? 'Статус средств' : 'Funds Status',
          lang === 'ru' ? 'Процентная ставка (%)' : 'Interest Rate (%)',
          lang === 'ru' ? 'Беспроцентный период (дней)' : 'Grace Period (Days)',
          lang === 'ru' ? 'Валюта' : 'Currency'
        ].map(escapeCsv).join(d));
      }

      accounts.forEach(acc => {
        const isCredit = acc.type === 'credit';
        const limit = acc.creditLimit || (isCredit ? acc.balance : 0);
        const usedDebt = isCredit ? Math.max(0, limit - acc.balance) : (acc.type === 'debt' ? acc.balance : 0);

        let statusDesc = lang === 'ru' ? 'Собственные средства (без долга)' : 'Own funds (no debt)';
        if (isCredit) {
          if (usedDebt === 0) {
            statusDesc = lang === 'ru' 
              ? `Лимит не тронут: потрачено 0 ${currency} (доступен весь лимит ${formatMoney(limit, currency, lang)})` 
              : `Limit untouched: 0 ${currency} spent (100% available: ${formatMoney(limit, currency, lang)})`;
          } else if (acc.balance <= 0) {
            statusDesc = lang === 'ru' 
              ? `Лимит исчерпан полностью: долг ${formatMoney(usedDebt, currency, lang)}, доступно 0 ${currency}`
              : `Limit fully spent: debt ${formatMoney(usedDebt, currency, lang)}, 0 ${currency} available`;
          } else {
            statusDesc = lang === 'ru' 
              ? `Потрачено: ${formatMoney(usedDebt, currency, lang)} (долг к возврату), доступно: ${formatMoney(acc.balance, currency, lang)}`
              : `Spent: ${formatMoney(usedDebt, currency, lang)} (debt), available: ${formatMoney(acc.balance, currency, lang)}`;
          }
        } else if (acc.type === 'debt') {
          statusDesc = lang === 'ru' ? `Кредит/Займ (долг: ${formatMoney(acc.balance, currency, lang)})` : `Loan/Debt: ${formatMoney(acc.balance, currency, lang)}`;
        }

        lines.push([
          acc.name,
          getBankName(acc.bank),
          getAccountTypeName(acc.type),
          formatNumberForCsv(acc.balance),
          isCredit ? formatNumberForCsv(limit) : '',
          isCredit ? formatNumberForCsv(usedDebt) : (acc.type === 'debt' ? formatNumberForCsv(acc.balance) : formatNumberForCsv(0)),
          statusDesc,
          acc.interestRate ? formatNumberForCsv(acc.interestRate) : '',
          acc.gracePeriodDays !== undefined ? String(acc.gracePeriodDays) : '',
          currency
        ].map(escapeCsv).join(d));
      });
    }

    // ==========================================
    // 3. PAYMENTS ONLY TABLE
    // ==========================================
    else if (selectedTable === 'payments') {
      if (includeHeader) {
        lines.push([
          lang === 'ru' ? 'Название платежа' : 'Payment Name',
          lang === 'ru' ? 'Сумма' : 'Amount',
          lang === 'ru' ? 'Периодичность' : 'Recurrence',
          lang === 'ru' ? 'День списания / Дата' : 'Due Date',
          lang === 'ru' ? 'Счёт списания' : 'Debit Account',
          lang === 'ru' ? 'Статус' : 'Active Status',
          lang === 'ru' ? 'Тип расписания' : 'Schedule Type'
        ].map(escapeCsv).join(d));
      }

      payments.forEach(p => {
        const acc = accounts.find(a => a.id === p.accountId);
        let recLabel: string = p.recurrence || 'monthly';
        if (recLabel === 'monthly') recLabel = lang === 'ru' ? 'Ежемесячно' : 'Monthly';
        else if (recLabel === 'weekly') recLabel = lang === 'ru' ? 'Еженедельно' : 'Weekly';
        else if (recLabel === 'yearly') recLabel = lang === 'ru' ? 'Ежегодно' : 'Yearly';
        else recLabel = lang === 'ru' ? 'Разовый' : 'One-off';

        lines.push([
          p.name,
          formatNumberForCsv(p.amount),
          recLabel,
          p.date || (lang === 'ru' ? 'Гибкая' : 'Flexible'),
          acc ? acc.name : (lang === 'ru' ? 'Не привязан' : 'None'),
          p.isActive ? (lang === 'ru' ? 'Активен' : 'Active') : (lang === 'ru' ? 'Приостановлен' : 'Paused'),
          p.isFlexible ? (lang === 'ru' ? 'Гибкий платёж' : 'Flexible') : (lang === 'ru' ? 'Фиксированная дата' : 'Fixed Date')
        ].map(escapeCsv).join(d));
      });
    }

    // ==========================================
    // 4. GOALS & PURCHASES TABLE
    // ==========================================
    else if (selectedTable === 'goals_purchases') {
      if (includeHeader) {
        lines.push([
          lang === 'ru' ? 'Тип записи' : 'Item Type',
          lang === 'ru' ? 'Название' : 'Name',
          lang === 'ru' ? 'Целевая сумма' : 'Target Amount',
          lang === 'ru' ? 'Уже накоплено' : 'Currently Saved',
          lang === 'ru' ? 'Осталось накопить' : 'Remaining',
          lang === 'ru' ? 'Взнос в месяц' : 'Monthly Contribution',
          lang === 'ru' ? 'Прогресс (%)' : 'Progress (%)'
        ].map(escapeCsv).join(d));
      }

      goals.forEach(g => {
        const remaining = Math.max(0, g.targetAmount - g.savedAmount);
        const pct = g.targetAmount > 0 ? ((g.savedAmount / g.targetAmount) * 100).toFixed(1) : '100';
        lines.push([
          lang === 'ru' ? 'Финансовая цель' : 'Financial Goal',
          g.name,
          formatNumberForCsv(g.targetAmount),
          formatNumberForCsv(g.savedAmount),
          formatNumberForCsv(remaining),
          formatNumberForCsv(g.monthlyContribution),
          pct
        ].map(escapeCsv).join(d));
      });

      purchases.forEach(p => {
        lines.push([
          lang === 'ru' ? 'Запланированная покупка' : 'Planned Purchase',
          p.name,
          formatNumberForCsv(p.amount),
          '-',
          formatNumberForCsv(p.amount),
          '-',
          '0'
        ].map(escapeCsv).join(d));
      });
    }

    // ==========================================
    // 5. FULL STRUCTURED REPORT
    // ==========================================
    else if (selectedTable === 'full_report') {
      // Header Section
      lines.push(escapeCsv(`=== ${lang === 'ru' ? 'ФИНАНСОВЫЙ ОТЧЁТ VIBE FINANCE' : 'VIBE FINANCE COMPREHENSIVE REPORT'} ===`));
      lines.push([lang === 'ru' ? 'Дата формирования' : 'Generated At', new Date().toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')].map(escapeCsv).join(d));
      lines.push([lang === 'ru' ? 'Базовая зарплата' : 'Monthly Salary', formatNumberForCsv(salary), currency].map(escapeCsv).join(d));
      lines.push([lang === 'ru' ? 'Всего операций в базе' : 'Total Transactions in DB', String(transactions.length)].map(escapeCsv).join(d));
      lines.push([lang === 'ru' ? 'Охват операций по датам' : 'Transactions Date Range', `${txDateStats.minDate} — ${txDateStats.maxDate}`].map(escapeCsv).join(d));
      lines.push('');
      lines.push('');

      // Section 1: Accounts
      lines.push(escapeCsv(`--- ${lang === 'ru' ? '1. СЧЕТА И НАКОПЛЕНИЯ' : '1. ACCOUNTS & BALANCES'} ---`));
      lines.push([
        lang === 'ru' ? 'Название' : 'Name',
        lang === 'ru' ? 'Банк' : 'Bank',
        lang === 'ru' ? 'Тип / Категория' : 'Type / Category',
        lang === 'ru' ? 'Доступно к трате (баланс)' : 'Available to Spend',
        lang === 'ru' ? 'Кредитный лимит' : 'Credit Limit',
        lang === 'ru' ? 'Фактически потрачено (долг)' : 'Actual Spent (Debt)',
        lang === 'ru' ? 'Статус средств / Пояснение' : 'Status / Clarification',
        lang === 'ru' ? 'Ставка (%)' : 'Rate (%)',
        lang === 'ru' ? 'Валюта' : 'Currency'
      ].map(escapeCsv).join(d));

      accounts.forEach(a => {
        const isCredit = a.type === 'credit';
        const limit = a.creditLimit || (isCredit ? a.balance : 0);
        const usedDebt = isCredit ? Math.max(0, limit - a.balance) : (a.type === 'debt' ? a.balance : 0);
        
        let statusClarification = '';
        let typeStr = getAccountTypeName(a.type);
        if (isCredit) {
          if (usedDebt === 0) {
            typeStr = lang === 'ru' ? 'Кредитная карта (лимит не тронут: 0 потрачено)' : 'Credit Card (untouched limit: 0 debt)';
            statusClarification = lang === 'ru' 
              ? `Лимит не тронут: потрачено 0 ${currency} (доступен весь лимит ${formatMoney(limit, currency, lang)})` 
              : `Untouched: 0 ${currency} spent (100% limit available: ${formatMoney(limit, currency, lang)})`;
          } else if (a.balance <= 0) {
            typeStr = lang === 'ru' ? `Кредитная карта (лимит исчерпан: долг ${formatMoney(usedDebt, currency, lang)})` : `Credit Card (limit exhausted: debt ${formatMoney(usedDebt, currency, lang)})`;
            statusClarification = lang === 'ru'
              ? `Лимит исчерпан полностью: долг ${formatMoney(usedDebt, currency, lang)}, доступно 0 ${currency}`
              : `Limit fully spent: debt ${formatMoney(usedDebt, currency, lang)}, 0 ${currency} available`;
          } else {
            typeStr = lang === 'ru' ? `Кредитная карта (потрачено: ${formatMoney(usedDebt, currency, lang)}, долг)` : `Credit Card (spent: ${formatMoney(usedDebt, currency, lang)}, debt)`;
            statusClarification = lang === 'ru'
              ? `Потрачено: ${formatMoney(usedDebt, currency, lang)} (долг к возврату), доступно: ${formatMoney(a.balance, currency, lang)}`
              : `Spent: ${formatMoney(usedDebt, currency, lang)} (debt), available: ${formatMoney(a.balance, currency, lang)}`;
          }
        } else if (a.type === 'debt') {
          statusClarification = lang === 'ru' ? `Кредит/Займ (долг: ${formatMoney(a.balance, currency, lang)})` : `Debt: ${formatMoney(a.balance, currency, lang)}`;
        } else {
          statusClarification = lang === 'ru' ? 'Собственные средства (без долга)' : 'Own funds (no debt)';
        }

        lines.push([
          a.name,
          getBankName(a.bank),
          typeStr,
          formatNumberForCsv(a.balance),
          isCredit ? formatNumberForCsv(limit) : '',
          isCredit ? formatNumberForCsv(usedDebt) : (a.type === 'debt' ? formatNumberForCsv(a.balance) : formatNumberForCsv(0)),
          statusClarification,
          a.interestRate ? formatNumberForCsv(a.interestRate) : '',
          currency
        ].map(escapeCsv).join(d));
      });
      lines.push('');
      lines.push('');

      // Section 2: Payments & Obligations (all payments included)
      lines.push(escapeCsv(`--- ${lang === 'ru' ? '2. РЕГУЛЯРНЫЕ ПЛАТЕЖИ И ОБЯЗАТЕЛЬСТВА' : '2. RECURRING PAYMENTS & OBLIGATIONS'} ---`));
      lines.push([
        lang === 'ru' ? 'Платёж' : 'Payment',
        lang === 'ru' ? 'Сумма' : 'Amount',
        lang === 'ru' ? 'Периодичность' : 'Recurrence',
        lang === 'ru' ? 'Дата' : 'Date',
        lang === 'ru' ? 'Счёт' : 'Account'
      ].map(escapeCsv).join(d));

      payments.forEach(p => {
        const acc = accounts.find(a => a.id === p.accountId);
        lines.push([
          p.name,
          formatNumberForCsv(p.amount),
          p.recurrence || 'monthly',
          p.date || 'Flexible',
          acc ? acc.name : ''
        ].map(escapeCsv).join(d));
      });
      lines.push('');
      lines.push('');

      // Section 3: Goals & Purchases
      lines.push(escapeCsv(`--- ${lang === 'ru' ? '3. ЦЕЛИ И ПЛАНИРУЕМЫЕ ПОКУПКИ' : '3. GOALS & PURCHASES'} ---`));
      lines.push([
        lang === 'ru' ? 'Цель / Покупка' : 'Goal / Purchase',
        lang === 'ru' ? 'Целевая сумма' : 'Target',
        lang === 'ru' ? 'Накоплено' : 'Saved',
        lang === 'ru' ? 'Взнос в мес' : 'Monthly'
      ].map(escapeCsv).join(d));

      goals.forEach(g => {
        lines.push([
          g.name,
          formatNumberForCsv(g.targetAmount),
          formatNumberForCsv(g.savedAmount),
          formatNumberForCsv(g.monthlyContribution)
        ].map(escapeCsv).join(d));
      });

      purchases.forEach(p => {
        lines.push([
          `[Покупка] ${p.name}`,
          formatNumberForCsv(p.amount),
          '-',
          '-'
        ].map(escapeCsv).join(d));
      });
      lines.push('');
      lines.push('');

      // Section 4: Journal of Transactions (Strictly Sorted & Complete)
      lines.push(escapeCsv(`--- ${lang === 'ru' ? '4. ЖУРНАЛ ОПЕРАЦИЙ' : '4. TRANSACTIONS JOURNAL'} ---`));
      
      // Standard headers: first 6 match backward compatibility, followed by extended details
      lines.push([
        lang === 'ru' ? 'Дата' : 'Date',
        lang === 'ru' ? 'Тип' : 'Type',
        lang === 'ru' ? 'Сумма' : 'Amount',
        lang === 'ru' ? 'Категория' : 'Category',
        lang === 'ru' ? 'Счёт' : 'Account',
        lang === 'ru' ? 'Комментарий' : 'Note',
        lang === 'ru' ? 'Валюта' : 'Currency',
        lang === 'ru' ? 'Основная категория' : 'Main Category',
        lang === 'ru' ? 'Подкатегория' : 'Subcategory',
        lang === 'ru' ? 'Банк' : 'Bank',
        lang === 'ru' ? 'Учёт в балансе' : 'Balance Tracking'
      ].map(escapeCsv).join(d));

      fullReportTransactions.forEach(tx => {
        const catMeta = getCategoryMeta(categories, tx.categoryId, t);
        const acc = accounts.find(a => a.id === tx.accountId);
        const typeLabel = tx.type === 'income' ? (lang === 'ru' ? 'Доход' : 'Income') : (lang === 'ru' ? 'Расход' : 'Expense');
        const mainCat = catMeta.parentName || catMeta.name;
        const subCat = catMeta.parentName ? catMeta.name : '';
        const trackingLabel = tx.skipBalanceUpdate 
          ? (lang === 'ru' ? 'Архивная' : 'Archived')
          : (lang === 'ru' ? 'Учтено' : 'Active');

        lines.push([
          tx.date,
          typeLabel,
          formatNumberForCsv(tx.amount),
          catMeta.fullName || catMeta.name,
          acc ? acc.name : '',
          tx.note || '',
          currency,
          mainCat,
          subCat,
          acc ? getBankName(acc.bank) : '',
          trackingLabel
        ].map(escapeCsv).join(d));
      });
    }

    // ==========================================
    // 6. JSON BACKUP
    // ==========================================
    else if (selectedTable === 'json_backup') {
      return JSON.stringify({
        version: 2,
        exportedAt: new Date().toISOString(),
        currency,
        salary,
        dateRange: {
          earliest: txDateStats.minDate,
          latest: txDateStats.maxDate,
          totalTransactions: transactions.length
        },
        accounts,
        payments,
        goals,
        purchases,
        transactions: fullReportTransactions,
        categories
      }, null, 2);
    }

    return lines.join('\r\n');
  };

  // Generate HTML Spreadsheet (.xls) for clean presentation in Excel without delimiter collisions
  const generateExcelWorkbookHtml = (): string => {
    const title = lang === 'ru' ? 'Финансовый отчёт Vibe Finance' : 'Vibe Finance Financial Report';
    
    // Sort transactions chronologically
    const sortedTx = fullReportTransactions;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Calibri, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 11pt; color: #1f2937; }
  table { border-collapse: collapse; margin-bottom: 24px; width: 100%; }
  th { background-color: #0f766e; color: #ffffff; font-weight: bold; border: 1px solid #115e59; padding: 8px 10px; text-align: left; }
  td { border: 1px solid #d1d5db; padding: 6px 10px; }
  tr:nth-child(even) { background-color: #f9fafb; }
  .section-title { font-size: 14pt; font-weight: bold; color: #0f766e; padding: 12px 0 6px; }
  .number { text-align: right; font-family: monospace; }
  .income { color: #059669; font-weight: bold; }
  .expense { color: #dc2626; font-weight: bold; }
  .badge-untouched { color: #059669; font-weight: bold; }
  .badge-debt { color: #dc2626; font-weight: bold; }
  .meta-box { background: #f3f4f6; border: 1px solid #e5e7eb; padding: 12px; margin-bottom: 20px; border-radius: 6px; }
</style>
</head>
<body>
  <h2>${title}</h2>
  <div class="meta-box">
    <p><b>${lang === 'ru' ? 'Дата формирования:' : 'Generated At:'}</b> ${new Date().toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}</p>
    <p><b>${lang === 'ru' ? 'Базовая зарплата:' : 'Monthly Salary:'}</b> ${formatMoney(salary, currency, lang)}</p>
    <p><b>${lang === 'ru' ? 'Всего операций в отчёте:' : 'Total Transactions:'}</b> ${sortedTx.length} ${lang === 'ru' ? 'шт.' : 'items'} (${txDateStats.minDate} — ${txDateStats.maxDate})</p>
  </div>

  <div class="section-title">1. ${lang === 'ru' ? 'Счета, карты и накопления' : 'Accounts & Balances'}</div>
  <table>
    <thead>
      <tr>
        <th>${lang === 'ru' ? 'Название' : 'Name'}</th>
        <th>${lang === 'ru' ? 'Банк' : 'Bank'}</th>
        <th>${lang === 'ru' ? 'Тип счёта' : 'Type'}</th>
        <th style="text-align: right;">${lang === 'ru' ? 'Доступно к трате' : 'Available'}</th>
        <th style="text-align: right;">${lang === 'ru' ? 'Кредитный лимит' : 'Credit Limit'}</th>
        <th style="text-align: right;">${lang === 'ru' ? 'Потрачено (долг)' : 'Spent (Debt)'}</th>
        <th>${lang === 'ru' ? 'Пояснение статуса' : 'Status'}</th>
        <th style="text-align: right;">${lang === 'ru' ? 'Ставка (%)' : 'Rate (%)'}</th>
      </tr>
    </thead>
    <tbody>
      ${accounts.map(a => {
        const isCredit = a.type === 'credit';
        const limit = a.creditLimit || (isCredit ? a.balance : 0);
        const usedDebt = isCredit ? Math.max(0, limit - a.balance) : (a.type === 'debt' ? a.balance : 0);
        return `<tr>
          <td><b>${a.name}</b></td>
          <td>${getBankName(a.bank)}</td>
          <td>${getAccountTypeName(a.type)}</td>
          <td class="number"><b>${formatMoney(a.balance, currency, lang)}</b></td>
          <td class="number">${isCredit ? formatMoney(limit, currency, lang) : '—'}</td>
          <td class="number ${usedDebt > 0 ? 'expense' : 'income'}">${isCredit || a.type === 'debt' ? formatMoney(usedDebt, currency, lang) : '0'}</td>
          <td>${isCredit && usedDebt === 0 ? '<span class="badge-untouched">✓ Лимит не тронут (долг 0)</span>' : (isCredit ? `<span class="badge-debt">Потрачено: ${formatMoney(usedDebt, currency, lang)}</span>` : 'Собственные средства')}</td>
          <td class="number">${a.interestRate ? a.interestRate + '%' : '—'}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <div class="section-title">2. ${lang === 'ru' ? 'Регулярные платежи и обязательства' : 'Recurring Payments'}</div>
  <table>
    <thead>
      <tr>
        <th>${lang === 'ru' ? 'Платёж' : 'Payment'}</th>
        <th style="text-align: right;">${lang === 'ru' ? 'Сумма' : 'Amount'}</th>
        <th>${lang === 'ru' ? 'Периодичность' : 'Recurrence'}</th>
        <th>${lang === 'ru' ? 'Дата списания' : 'Date'}</th>
        <th>${lang === 'ru' ? 'Счёт' : 'Account'}</th>
      </tr>
    </thead>
    <tbody>
      ${payments.map(p => {
        const acc = accounts.find(a => a.id === p.accountId);
        return `<tr>
          <td><b>${p.name}</b></td>
          <td class="number"><b>${formatMoney(p.amount, currency, lang)}</b></td>
          <td>${p.recurrence || 'monthly'}</td>
          <td>${p.date || 'Flexible'}</td>
          <td>${acc ? acc.name : '—'}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <div class="section-title">3. ${lang === 'ru' ? 'Цели и запланированные покупки' : 'Goals & Purchases'}</div>
  <table>
    <thead>
      <tr>
        <th>${lang === 'ru' ? 'Тип' : 'Type'}</th>
        <th>${lang === 'ru' ? 'Название' : 'Name'}</th>
        <th style="text-align: right;">${lang === 'ru' ? 'Целевая сумма' : 'Target'}</th>
        <th style="text-align: right;">${lang === 'ru' ? 'Накоплено' : 'Saved'}</th>
        <th style="text-align: right;">${lang === 'ru' ? 'Взнос в месяц' : 'Monthly'}</th>
      </tr>
    </thead>
    <tbody>
      ${goals.map(g => `<tr>
        <td>🎯 ${lang === 'ru' ? 'Цель' : 'Goal'}</td>
        <td><b>${g.name}</b></td>
        <td class="number"><b>${formatMoney(g.targetAmount, currency, lang)}</b></td>
        <td class="number" style="color: #059669;">${formatMoney(g.savedAmount, currency, lang)}</td>
        <td class="number">${formatMoney(g.monthlyContribution, currency, lang)}</td>
      </tr>`).join('')}
      ${purchases.map(p => `<tr>
        <td>🛍️ ${lang === 'ru' ? 'Покупка' : 'Purchase'}</td>
        <td><b>${p.name}</b></td>
        <td class="number"><b>${formatMoney(p.amount, currency, lang)}</b></td>
        <td class="number">—</td>
        <td class="number">—</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="section-title">4. ${lang === 'ru' ? 'Журнал операций (хронологический реестр)' : 'Transactions Journal'}</div>
  <table>
    <thead>
      <tr>
        <th>${lang === 'ru' ? 'Дата' : 'Date'}</th>
        <th>${lang === 'ru' ? 'Тип' : 'Type'}</th>
        <th style="text-align: right;">${lang === 'ru' ? 'Сумма' : 'Amount'}</th>
        <th>${lang === 'ru' ? 'Категория' : 'Category'}</th>
        <th>${lang === 'ru' ? 'Подкатегория' : 'Subcategory'}</th>
        <th>${lang === 'ru' ? 'Счёт' : 'Account'}</th>
        <th>${lang === 'ru' ? 'Банк' : 'Bank'}</th>
        <th>${lang === 'ru' ? 'Комментарий' : 'Note'}</th>
      </tr>
    </thead>
    <tbody>
      ${sortedTx.map(tx => {
        const catMeta = getCategoryMeta(categories, tx.categoryId, t);
        const acc = accounts.find(a => a.id === tx.accountId);
        const isIncome = tx.type === 'income';
        return `<tr>
          <td style="font-family: monospace;">${tx.date}</td>
          <td class="${isIncome ? 'income' : 'expense'}">${isIncome ? (lang === 'ru' ? 'Доход' : 'Income') : (lang === 'ru' ? 'Расход' : 'Expense')}</td>
          <td class="number ${isIncome ? 'income' : 'expense'}">${isIncome ? '+' : '-'}${formatMoney(tx.amount, currency, lang)}</td>
          <td><b>${catMeta.parentName || catMeta.name}</b></td>
          <td>${catMeta.parentName ? catMeta.name : '—'}</td>
          <td>${acc ? acc.name : '—'}</td>
          <td>${acc ? getBankName(acc.bank) : '—'}</td>
          <td>${tx.note || ''}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</body>
</html>`;
  };

  // Re-calculate CSV content whenever parameters change (including full transactions array!)
  const csvContent = useMemo(() => {
    return generateCsvContent();
  }, [
    selectedTable, delimiter, decimalSep, includeHeader, 
    filteredTransactions, fullReportTransactions, accounts, payments, 
    goals, purchases, categories, salary, currency, lang, txSortOrder,
    transactions // Explicitly depend on raw transactions!
  ]);

  const downloadFilename = useMemo(() => {
    const dateStr = new Date().toISOString().split('T')[0];
    if (selectedTable === 'json_backup') {
      return `vibe_finance_backup_${dateStr}.json`;
    }
    return `vibe_finance_${selectedTable}_${dateStr}.csv`;
  }, [selectedTable]);

  // Object URL & Data URL for download
  const [downloadBlobUrl, setDownloadBlobUrl] = useState<string>('');

  const downloadDataUri = useMemo(() => {
    try {
      const mime = selectedTable === 'json_backup' ? 'application/json;charset=utf-8;' : 'text/csv;charset=utf-8;';
      const prefix = selectedTable === 'json_backup' ? '' : '\uFEFF';
      return `data:${mime},${encodeURIComponent(prefix + csvContent)}`;
    } catch {
      return '';
    }
  }, [csvContent, selectedTable]);

  React.useEffect(() => {
    let url = '';
    try {
      const mime = selectedTable === 'json_backup' ? 'application/json;charset=utf-8;' : 'text/csv;charset=utf-8;';
      const prefix = selectedTable === 'json_backup' ? '' : '\uFEFF';
      const blob = new Blob([prefix + csvContent], { type: mime });
      url = URL.createObjectURL(blob);
      setDownloadBlobUrl(url);
    } catch (e) {
      console.error(e);
    }
    return () => {
      if (url) {
        setTimeout(() => {
          try { URL.revokeObjectURL(url); } catch {}
        }, 120000);
      }
    };
  }, [csvContent, selectedTable]);

  // Direct, iframe-safe download trigger
  const triggerDirectDownload = (customContent?: string, customName?: string, customMime = 'text/csv;charset=utf-8;') => {
    try {
      const contentToUse = customContent !== undefined ? customContent : csvContent;
      const nameToUse = customName || downloadFilename;
      const prefix = nameToUse.endsWith('.json') ? '' : '\uFEFF';
      const fullData = prefix + contentToUse;

      // Strategy 1: Blob URL via hidden <a> tag (no target="_blank" so iframe doesn't block it)
      try {
        const blob = new Blob([fullData], { type: customMime });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nameToUse;
        link.style.position = 'fixed';
        link.style.top = '-9999px';
        link.style.left = '-9999px';
        link.style.opacity = '0';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          try { 
            if (document.body.contains(link)) document.body.removeChild(link); 
            URL.revokeObjectURL(url);
          } catch {}
        }, 60000);
        return true;
      } catch (blobErr) {
        console.warn('Blob download failed, trying data URI:', blobErr);
      }

      // Strategy 2: Data URI fallback (completely bypasses blob sandbox restrictions)
      const dataUri = `data:${customMime},${encodeURIComponent(fullData)}`;
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = nameToUse;
      link.style.position = 'fixed';
      link.style.top = '-9999px';
      link.style.left = '-9999px';
      link.style.opacity = '0';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try { 
          if (document.body.contains(link)) document.body.removeChild(link); 
        } catch {}
      }, 5000);
      return true;
    } catch (e) {
      console.error('All download methods failed:', e);
      return false;
    }
  };

  // Open helper download page in new tab (bypasses iframe sandbox restrictions completely)
  const openDownloadPage = (customContent?: string, customName?: string, customMime = 'text/csv;charset=utf-8;') => {
    try {
      const content = customContent !== undefined ? customContent : csvContent;
      const filename = customName || downloadFilename;
      const isJson = filename.endsWith('.json');
      const isExcel = filename.endsWith('.xls');
      const title = lang === 'ru' ? `Скачать ${filename} — Vibe Finance` : `Download ${filename} — Vibe Finance`;
      const heading = lang === 'ru' ? 'Экспорт данных Vibe Finance' : 'Vibe Finance Data Export';
      const fileLabel = lang === 'ru' ? 'Файл подготовлен и готов к загрузке:' : 'File ready to download:';
      const btnDl = lang === 'ru' ? '⬇️ Скачать файл на диск' : '⬇️ Save File to Disk';
      const btnCopy = lang === 'ru' ? '📋 Скопировать весь текст' : '📋 Copy All Text';
      const tip = lang === 'ru' 
        ? 'Загрузка файла инициирована автоматически. Если сохранение не началось в течение 1–2 секунд, нажмите зелёную кнопку выше.' 
        : 'Download initiated automatically. If it does not begin within 1–2 seconds, click the green button above.';
      const viewRaw = lang === 'ru' ? 'Содержимое файла (можно выделить и скопировать):' : 'File raw content:';

      const safeJsonContent = JSON.stringify(content).replace(/<\/script/gi, '<\\/script');

      const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0d1117; color: #e6edf3; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 16px; padding: 32px 28px; max-width: 640px; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,0.6); text-align: center; }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); border-radius: 20px; color: #34d399; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
    h1 { margin: 0 0 6px; font-size: 22px; color: #58a6ff; }
    .sub { color: #8b949e; font-size: 13px; margin: 0 0 16px; }
    .filename { background: #0d1117; border: 1px solid #30363d; padding: 12px 16px; border-radius: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; color: #7ee787; word-break: break-all; margin-bottom: 24px; font-weight: bold; }
    .actions { display: flex; flex-direction: column; gap: 10px; }
    @media (min-width: 480px) { .actions { flex-direction: row; } }
    .btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 18px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; border: none; cursor: pointer; transition: all 0.15s ease; user-select: none; }
    .btn-primary { background: #238636; color: #ffffff; box-shadow: 0 0 20px rgba(35,134,54,0.35); }
    .btn-primary:hover { background: #2ea043; }
    .btn-secondary { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; }
    .btn-secondary:hover { background: #30363d; color: #ffffff; }
    .toast { display: none; margin-top: 14px; padding: 10px 16px; background: #238636; color: white; border-radius: 8px; font-size: 13px; font-weight: bold; }
    .tip { color: #8b949e; font-size: 12px; line-height: 1.5; margin-top: 18px; }
    .preview-box { margin-top: 20px; text-align: left; }
    .preview-box label { font-size: 11px; font-weight: 600; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: block; }
    textarea { width: 100%; height: 140px; background: #0d1117; border: 1px solid #30363d; border-radius: 8px; color: #c9d1d9; font-family: monospace; font-size: 11px; padding: 12px; resize: vertical; outline: none; }
    .close-link { display: inline-block; margin-top: 14px; font-size: 12px; color: #8b949e; text-decoration: underline; cursor: pointer; }
    .close-link:hover { color: #c9d1d9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">✓ Файл сформирован</div>
    <h1>${heading}</h1>
    <p class="sub">${fileLabel}</p>
    <div class="filename">${filename}</div>
    
    <div class="actions">
      <a id="dlBtn" class="btn btn-primary" href="" download="${filename}">${btnDl}</a>
      <button id="copyBtn" class="btn btn-secondary">${btnCopy}</button>
    </div>
    
    <div id="toast" class="toast">✓ Скопировано в буфер обмена!</div>
    <div class="tip">${tip}</div>

    <div class="preview-box">
      <label>${viewRaw}</label>
      <textarea id="rawText" readonly></textarea>
    </div>

    <div>
      <a class="close-link" onclick="window.close()">Закрыть эту страницу</a>
    </div>
  </div>

  <script>
    const content = ${safeJsonContent};
    document.getElementById('rawText').value = content;

    const isJson = ${isJson ? 'true' : 'false'};
    const prefix = isJson ? '' : '\\uFEFF';
    const blob = new Blob([prefix + content], { type: '${customMime}' });
    const url = URL.createObjectURL(blob);
    const dlBtn = document.getElementById('dlBtn');
    dlBtn.href = url;
    
    // Auto-trigger download outside iframe sandbox
    setTimeout(() => {
      try { dlBtn.click(); } catch(e) {}
    }, 200);

    document.getElementById('copyBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => {
        showToast();
      }).catch(() => {
        const ta = document.getElementById('rawText');
        ta.select();
        document.execCommand('copy');
        showToast();
      });
    });

    function showToast() {
      const toast = document.getElementById('toast');
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }
  </script>
</body>
</html>`;

      const pageBlob = new Blob([html], { type: 'text/html;charset=utf-8;' });
      const pageUrl = URL.createObjectURL(pageBlob);
      setDownloadPageUrl(pageUrl);

      // Open new window (bypasses iframe sandbox)
      const newWin = window.open(pageUrl, '_blank');
      if (newWin) {
        setStatusMessage(lang === 'ru' ? '✓ Страница загрузки открыта в новой вкладке!' : '✓ Download page opened in new tab!');
      } else {
        setStatusMessage(lang === 'ru' ? 'Всплывающее окно заблокировано. Нажмите «Открыть страницу загрузки» ниже.' : 'Popup blocked. Click "Open Download Page" below.');
      }
      setTimeout(() => setStatusMessage(null), 6000);

      // Also trigger in-iframe download attempt
      triggerDirectDownload(content, filename, customMime);
    } catch (err) {
      console.error(err);
      triggerDirectDownload(customContent, customName, customMime);
    }
  };

  // Immediate download handler with visual feedback and new-tab opening
  const handleDownload = (e?: React.MouseEvent) => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4500);

    const mime = selectedTable === 'json_backup' ? 'application/json;charset=utf-8;' : 'text/csv;charset=utf-8;';
    openDownloadPage(csvContent, downloadFilename, mime);
  };

  // Download Excel Workbook (.xls)
  const handleDownloadExcel = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `vibe_finance_full_report_${dateStr}.xls`;
    const htmlWorkbook = generateExcelWorkbookHtml();
    openDownloadPage(htmlWorkbook, filename, 'application/vnd.ms-excel;charset=utf-8;');
  };

  // Batch download: exports all 4 individual clean tables sequentially
  const handleBatchDownloadAllTables = async () => {
    setBatchDownloading(true);
    const dateStr = new Date().toISOString().split('T')[0];
    const prevTable = selectedTable;

    setStatusMessage(lang === 'ru' ? 'Формирование пакета раздельных файлов...' : 'Preparing separate table files...');

    const tablesToExport: Array<{ id: 'transactions' | 'accounts' | 'payments' | 'goals_purchases'; nameRu: string; nameEn: string }> = [
      { id: 'transactions', nameRu: '1_Операции', nameEn: '1_Transactions' },
      { id: 'accounts', nameRu: '2_Счета_и_карты', nameEn: '2_Accounts' },
      { id: 'payments', nameRu: '3_Регулярные_платежи', nameEn: '3_Payments' },
      { id: 'goals_purchases', nameRu: '4_Цели_и_покупки', nameEn: '4_Goals_Purchases' }
    ];

    try {
      for (let i = 0; i < tablesToExport.length; i++) {
        const item = tablesToExport[i];
        setSelectedTable(item.id);
        await new Promise(r => setTimeout(r, 200));

        // Generate CSV for this table
        const d = delimiter;
        const lines: string[] = [];

        if (item.id === 'transactions') {
          lines.push([
            lang === 'ru' ? 'Дата' : 'Date',
            lang === 'ru' ? 'Тип операции' : 'Type',
            lang === 'ru' ? 'Сумма' : 'Amount',
            lang === 'ru' ? 'Валюта' : 'Currency',
            lang === 'ru' ? 'Основная категория' : 'Main Category',
            lang === 'ru' ? 'Подкатегория' : 'Subcategory',
            lang === 'ru' ? 'Счёт' : 'Account',
            lang === 'ru' ? 'Банк' : 'Bank',
            lang === 'ru' ? 'Тип счёта' : 'Account Type',
            lang === 'ru' ? 'Комментарий' : 'Note',
            lang === 'ru' ? 'Учёт в балансе' : 'Balance Tracking'
          ].map(escapeCsv).join(d));

          fullReportTransactions.forEach(tx => {
            const catMeta = getCategoryMeta(categories, tx.categoryId, t);
            const acc = accounts.find(a => a.id === tx.accountId);
            lines.push([
              tx.date,
              tx.type === 'income' ? (lang === 'ru' ? 'Доход' : 'Income') : (lang === 'ru' ? 'Расход' : 'Expense'),
              formatNumberForCsv(tx.amount),
              currency,
              catMeta.parentName || catMeta.name,
              catMeta.parentName ? catMeta.name : '',
              acc ? acc.name : '',
              acc ? getBankName(acc.bank) : '',
              acc ? getAccountTypeName(acc.type) : '',
              tx.note || '',
              tx.skipBalanceUpdate ? (lang === 'ru' ? 'Архивная' : 'Archived') : (lang === 'ru' ? 'Учтено' : 'Active')
            ].map(escapeCsv).join(d));
          });
        } else if (item.id === 'accounts') {
          lines.push([
            lang === 'ru' ? 'Название счёта' : 'Account Name',
            lang === 'ru' ? 'Банк' : 'Bank',
            lang === 'ru' ? 'Тип счёта' : 'Account Type',
            lang === 'ru' ? 'Текущий баланс / Доступно' : 'Current Balance / Available',
            lang === 'ru' ? 'Кредитный лимит' : 'Credit Limit',
            lang === 'ru' ? 'Фактически потрачено (долг)' : 'Actual Spent (Debt)',
            lang === 'ru' ? 'Статус средств' : 'Funds Status',
            lang === 'ru' ? 'Процентная ставка (%)' : 'Interest Rate (%)',
            lang === 'ru' ? 'Валюта' : 'Currency'
          ].map(escapeCsv).join(d));

          accounts.forEach(acc => {
            const isCredit = acc.type === 'credit';
            const limit = acc.creditLimit || (isCredit ? acc.balance : 0);
            const usedDebt = isCredit ? Math.max(0, limit - acc.balance) : (acc.type === 'debt' ? acc.balance : 0);
            lines.push([
              acc.name,
              getBankName(acc.bank),
              getAccountTypeName(acc.type),
              formatNumberForCsv(acc.balance),
              isCredit ? formatNumberForCsv(limit) : '',
              isCredit ? formatNumberForCsv(usedDebt) : (acc.type === 'debt' ? formatNumberForCsv(acc.balance) : formatNumberForCsv(0)),
              isCredit ? (usedDebt === 0 ? 'Лимит не тронут' : `Потрачено: ${usedDebt}`) : 'Собственные средства',
              acc.interestRate ? formatNumberForCsv(acc.interestRate) : '',
              currency
            ].map(escapeCsv).join(d));
          });
        } else if (item.id === 'payments') {
          lines.push([
            lang === 'ru' ? 'Платёж' : 'Payment',
            lang === 'ru' ? 'Сумма' : 'Amount',
            lang === 'ru' ? 'Периодичность' : 'Recurrence',
            lang === 'ru' ? 'Дата списания' : 'Due Date',
            lang === 'ru' ? 'Счёт' : 'Account'
          ].map(escapeCsv).join(d));

          payments.forEach(p => {
            const acc = accounts.find(a => a.id === p.accountId);
            lines.push([
              p.name,
              formatNumberForCsv(p.amount),
              p.recurrence || 'monthly',
              p.date || 'Flexible',
              acc ? acc.name : ''
            ].map(escapeCsv).join(d));
          });
        } else if (item.id === 'goals_purchases') {
          lines.push([
            lang === 'ru' ? 'Тип' : 'Type',
            lang === 'ru' ? 'Название' : 'Name',
            lang === 'ru' ? 'Целевая сумма' : 'Target',
            lang === 'ru' ? 'Накоплено' : 'Saved',
            lang === 'ru' ? 'Взнос в мес' : 'Monthly'
          ].map(escapeCsv).join(d));

          goals.forEach(g => {
            lines.push([
              lang === 'ru' ? 'Цель' : 'Goal',
              g.name,
              formatNumberForCsv(g.targetAmount),
              formatNumberForCsv(g.savedAmount),
              formatNumberForCsv(g.monthlyContribution)
            ].map(escapeCsv).join(d));
          });

          purchases.forEach(p => {
            lines.push([
              lang === 'ru' ? 'Покупка' : 'Purchase',
              p.name,
              formatNumberForCsv(p.amount),
              '-',
              '-'
            ].map(escapeCsv).join(d));
          });
        }

        const fileName = `vibe_finance_${lang === 'ru' ? item.nameRu : item.nameEn}_${dateStr}.csv`;
        triggerDirectDownload(lines.join('\r\n'), fileName);
        await new Promise(r => setTimeout(r, 400));
      }

      setStatusMessage(lang === 'ru' ? '✓ Все 4 таблицы успешно скачаны отдельными файлами!' : '✓ All 4 separate CSV files downloaded successfully!');
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setSelectedTable(prevTable);
      setBatchDownloading(false);
    }
  };

  // Copy to Clipboard as TSV (Tab separated for direct paste into Excel / Sheets cells)
  const handleCopyTsv = () => {
    const origDelimiter = delimiter;
    const lines = csvContent.split('\r\n');
    const tsvContent = lines
      .map(line => line.split(origDelimiter).map(cell => cell.replace(/^"(.*)"$/, '$1')).join('\t'))
      .join('\n');

    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopied(true);
      setStatusMessage(lang === 'ru' ? '✓ Таблица скопирована! Откройте Excel или Google Таблицы и нажмите Ctrl+V' : '✓ Table copied! Open Excel/Sheets and press Ctrl+V');
      setTimeout(() => {
        setCopied(false);
        setStatusMessage(null);
      }, 5000);
    });
  };

  // Copy raw CSV string with BOM
  const handleCopyRawCsv = () => {
    navigator.clipboard.writeText(csvContent).then(() => {
      setCopiedCsv(true);
      setStatusMessage(lang === 'ru' ? '✓ Текст CSV скопирован в буфер обмена!' : '✓ Raw CSV text copied to clipboard!');
      setTimeout(() => {
        setCopiedCsv(false);
        setStatusMessage(null);
      }, 4000);
    });
  };

  // Summary Metrics Calculation
  const previewStats = useMemo(() => {
    if (selectedTable === 'transactions') {
      const income = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return {
        count: filteredTransactions.length,
        income,
        expense,
        net: income - expense
      };
    }
    if (selectedTable === 'accounts') {
      const ownTotal = accounts.filter(a => a.type !== 'debt' && a.type !== 'credit').reduce((s, a) => s + a.balance, 0);
      const creditCards = accounts.filter(a => a.type === 'credit');
      const totalCreditLimit = creditCards.reduce((sum, a) => sum + (a.creditLimit || a.balance), 0);
      const totalCreditDebt = creditCards.reduce((sum, a) => sum + Math.max(0, (a.creditLimit || a.balance) - a.balance), 0);
      const totalCreditAvailable = creditCards.reduce((sum, a) => sum + a.balance, 0);
      return { 
        count: accounts.length, 
        ownTotal, 
        totalCreditLimit, 
        totalCreditDebt, 
        totalCreditAvailable 
      };
    }
    if (selectedTable === 'payments') {
      const total = payments.reduce((s, p) => s + (p.isActive ? p.amount : 0), 0);
      return { count: payments.length, total };
    }
    if (selectedTable === 'goals_purchases') {
      const totalGoals = goals.reduce((s, g) => s + g.targetAmount, 0);
      const totalPurchases = purchases.reduce((s, p) => s + p.amount, 0);
      return { count: goals.length + purchases.length, totalGoals, totalPurchases };
    }
    // Full report metrics
    const income = fullReportTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = fullReportTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const ownTotal = accounts.filter(a => a.type !== 'debt' && a.type !== 'credit').reduce((s, a) => s + a.balance, 0);
    return { 
      count: fullReportTransactions.length,
      income,
      expense,
      ownTotal,
      accountsCount: accounts.length,
      paymentsCount: payments.length,
      goalsPurchasesCount: goals.length + purchases.length
    };
  }, [selectedTable, filteredTransactions, fullReportTransactions, accounts, payments, goals, purchases]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-5xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#30363d] bg-[#0d1117]/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white">
                {lang === 'ru' ? 'Экспорт данных в Excel / CSV' : 'Export Data to Excel / CSV'}
              </h2>
              <p className="text-xs text-neutral-400">
                {lang === 'ru' ? 'Полная совместимость с Microsoft Excel (BOM UTF-8), Google Таблицами и Apple Numbers' : 'Fully compatible with Microsoft Excel (BOM UTF-8), Google Sheets, and Numbers'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Control Strip: Table Selectors */}
        <div className="p-4 bg-[#161b22] border-b border-[#30363d] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Table Type Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto compact-scrollbar pb-1">
            {[
              { id: 'full_report', label: lang === 'ru' ? 'Полный отчёт' : 'Full Report', icon: FileText, count: fullReportTransactions.length + accounts.length + payments.length + goals.length + purchases.length },
              { id: 'transactions', label: lang === 'ru' ? 'Операции' : 'Transactions', icon: Table, count: filteredTransactions.length },
              { id: 'accounts', label: lang === 'ru' ? 'Счета и Карты' : 'Accounts', icon: Wallet, count: accounts.length },
              { id: 'payments', label: lang === 'ru' ? 'Платежи' : 'Payments', icon: CalendarDays, count: payments.length },
              { id: 'goals_purchases', label: lang === 'ru' ? 'Цели и Покупки' : 'Goals & Purchases', icon: PiggyBank, count: goals.length + purchases.length },
              { id: 'json_backup', label: lang === 'ru' ? 'Резервная копия (JSON)' : 'JSON Backup', icon: Database, count: null }
            ].map(tab => {
              const Icon = tab.icon;
              const isSel = selectedTable === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTable(tab.id as any)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isSel 
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20' 
                      : 'bg-[#0d1117] text-neutral-300 hover:text-white border border-[#30363d]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isSel ? 'bg-black/20 text-black font-bold' : 'bg-neutral-800 text-neutral-400 font-mono'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Format & Regional Settings */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Period selector for Transactions or Full Report */}
            {selectedTable === 'transactions' && (
              <div className="flex items-center gap-1 bg-[#0d1117] border border-[#30363d] p-1 rounded-xl">
                <span className="text-[11px] text-neutral-400 px-1.5">{lang === 'ru' ? 'Период:' : 'Period:'}</span>
                <select
                  value={txPeriod}
                  onChange={e => setTxPeriod(e.target.value as any)}
                  className="bg-[#161b22] text-neutral-200 border-none outline-none rounded-lg px-2 py-1 text-xs font-medium"
                >
                  <option value="all">{lang === 'ru' ? 'Все время' : 'All Time'} ({transactions.length})</option>
                  <option value="this_month">{lang === 'ru' ? 'Этот месяц' : 'This Month'}</option>
                  <option value="last_month">{lang === 'ru' ? 'Прошлый месяц' : 'Last Month'}</option>
                  <option value="this_year">{lang === 'ru' ? 'Этот год' : 'This Year'}</option>
                </select>
              </div>
            )}

            {selectedTable === 'full_report' && (
              <div className="flex items-center gap-1 bg-[#0d1117] border border-[#30363d] p-1 rounded-xl">
                <span className="text-[11px] text-neutral-400 px-1.5">{lang === 'ru' ? 'Охват операций:' : 'Transactions Scope:'}</span>
                <select
                  value={fullReportPeriod}
                  onChange={e => setFullReportPeriod(e.target.value as any)}
                  className="bg-[#161b22] text-neutral-200 border-none outline-none rounded-lg px-2 py-1 text-xs font-medium"
                >
                  <option value="all">{lang === 'ru' ? 'Все операции (100% базы)' : 'All Transactions (100%)'} ({transactions.length})</option>
                  <option value="last_12_months">{lang === 'ru' ? 'За последние 12 месяцев' : 'Last 12 Months'}</option>
                  <option value="last_6_months">{lang === 'ru' ? 'За последние 6 месяцев' : 'Last 6 Months'}</option>
                  <option value="last_3_months">{lang === 'ru' ? 'За последние 3 месяца' : 'Last 3 Months'}</option>
                  <option value="this_month">{lang === 'ru' ? 'Только этот месяц' : 'This Month Only'}</option>
                </select>
              </div>
            )}

            {/* Sort Order Toggle */}
            {(selectedTable === 'transactions' || selectedTable === 'full_report') && (
              <button
                onClick={() => setTxSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1 px-2 py-1 bg-[#0d1117] border border-[#30363d] text-neutral-300 hover:text-white rounded-xl text-xs font-medium transition-colors"
                title={lang === 'ru' ? 'Изменить порядок сортировки по дате' : 'Toggle date sort order'}
              >
                {txSortOrder === 'desc' ? (
                  <>
                    <ArrowDownWideNarrow className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{lang === 'ru' ? 'Сначала новые' : 'Newest First'}</span>
                  </>
                ) : (
                  <>
                    <ArrowUpNarrowWide className="w-3.5 h-3.5 text-blue-400" />
                    <span>{lang === 'ru' ? 'Хронологический' : 'Oldest First'}</span>
                  </>
                )}
              </button>
            )}

            {/* Delimiter */}
            <div className="flex items-center gap-1 bg-[#0d1117] border border-[#30363d] p-1 rounded-xl">
              <span className="text-[11px] text-neutral-400 px-1.5">{lang === 'ru' ? 'Разделитель:' : 'Separator:'}</span>
              <button
                onClick={() => setDelimiter(';')}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${delimiter === ';' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-neutral-400 hover:text-neutral-200'}`}
                title={lang === 'ru' ? 'Точка с запятой (рекомендуется для русской версии Excel)' : 'Semicolon (Excel EU / RU)'}
              >
                ; (Excel RU)
              </button>
              <button
                onClick={() => setDelimiter(',')}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${delimiter === ',' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-neutral-400 hover:text-neutral-200'}`}
                title={lang === 'ru' ? 'Запятая (стандартный CSV / Google Sheets / Numbers)' : 'Comma (Standard / Google Sheets)'}
              >
                , (Standard)
              </button>
            </div>
          </div>
        </div>

        {/* Live Table Preview Section */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3 bg-[#0d1117]">
          {/* Top Preview Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                {lang === 'ru' ? 'Предпросмотр данных отчёта' : 'Report Live Preview'}
              </span>
              
              <div className="flex items-center gap-1.5 ml-2 text-xs font-mono text-neutral-300 bg-[#161b22] px-2.5 py-1 rounded-lg border border-[#30363d]">
                <span className="text-neutral-500">{lang === 'ru' ? 'Записей:' : 'Records:'}</span>
                <span className="font-bold text-emerald-400">{previewStats.count}</span>
              </div>
            </div>

            {/* Action Bar inside Preview */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRawCode(prev => !prev)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  showRawCode 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-[#161b22] text-neutral-400 hover:text-white border-[#30363d]'
                }`}
              >
                {showRawCode ? (lang === 'ru' ? 'Табличный вид' : 'Table View') : (lang === 'ru' ? 'Исходный CSV текст' : 'Raw CSV Text')}
              </button>
            </div>
          </div>

          {/* Full Report Highlights Banner & Recent Months Activity */}
          {selectedTable === 'full_report' && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 flex flex-col gap-3">
              {/* 4 Key Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d]">
                  <div className="text-[11px] text-neutral-400">{lang === 'ru' ? 'Собственные средства' : 'Own Capital'}</div>
                  <div className="text-sm font-bold text-white font-mono">{formatMoney((previewStats as any).ownTotal || 0, currency, lang)}</div>
                </div>
                <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d]">
                  <div className="text-[11px] text-neutral-400">{lang === 'ru' ? 'Суммарный доход' : 'Total Incomes'}</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono">+{formatMoney((previewStats as any).income || 0, currency, lang)}</div>
                </div>
                <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d]">
                  <div className="text-[11px] text-neutral-400">{lang === 'ru' ? 'Суммарный расход' : 'Total Expenses'}</div>
                  <div className="text-sm font-bold text-neutral-200 font-mono">-{formatMoney((previewStats as any).expense || 0, currency, lang)}</div>
                </div>
                <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d]">
                  <div className="text-[11px] text-neutral-400">{lang === 'ru' ? 'Операций в отчёте' : 'Transactions in Report'}</div>
                  <div className="text-sm font-bold text-amber-300 font-mono">
                    {fullReportTransactions.length} {lang === 'ru' ? 'шт.' : 'items'}
                    <span className="text-[10px] text-neutral-500 font-normal ml-1">({txDateStats.minDate} — {txDateStats.maxDate})</span>
                  </div>
                </div>
              </div>

              {/* Monthly Activity Assurance Bar (Shows transactions breakdown for last 6 calendar months) */}
              <div className="border-t border-[#30363d]/60 pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{lang === 'ru' ? 'Активность по последним месяцам (гарантия полноты базы):' : 'Recent months coverage in database:'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {txDateStats.recentMonths.map((m, idx) => (
                    <span 
                      key={idx} 
                      className={`text-[11px] px-2 py-0.5 rounded-md border font-mono ${
                        m.count > 0 
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 font-medium' 
                          : 'bg-[#0d1117] text-neutral-500 border-[#30363d]'
                      }`}
                      title={`${m.label}: ${m.count} ${lang === 'ru' ? 'операций' : 'transactions'}`}
                    >
                      {m.label.split(' ')[0]}: <b className={m.count > 0 ? 'text-white' : 'text-neutral-500'}>{m.count}</b>
                    </span>
                  ))}
                </div>
              </div>

              {/* Sub-tabs for Full Report Preview */}
              <div className="flex items-center gap-1 pt-1 border-t border-[#30363d]/60 overflow-x-auto compact-scrollbar">
                <button
                  onClick={() => setFullReportPreviewTab('transactions')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    fullReportPreviewTab === 'transactions'
                      ? 'bg-[#30363d] text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  📝 {lang === 'ru' ? `Журнал операций (${fullReportTransactions.length})` : `Transactions (${fullReportTransactions.length})`}
                </button>
                <button
                  onClick={() => setFullReportPreviewTab('accounts')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    fullReportPreviewTab === 'accounts'
                      ? 'bg-[#30363d] text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  💳 {lang === 'ru' ? `Счета и карты (${accounts.length})` : `Accounts (${accounts.length})`}
                </button>
                <button
                  onClick={() => setFullReportPreviewTab('payments')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    fullReportPreviewTab === 'payments'
                      ? 'bg-[#30363d] text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  🔄 {lang === 'ru' ? `Обязательства (${payments.length})` : `Payments (${payments.length})`}
                </button>
                <button
                  onClick={() => setFullReportPreviewTab('goals_purchases')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    fullReportPreviewTab === 'goals_purchases'
                      ? 'bg-[#30363d] text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  🎯 {lang === 'ru' ? `Цели и покупки (${goals.length + purchases.length})` : `Goals & Purchases (${goals.length + purchases.length})`}
                </button>
              </div>
            </div>
          )}

          {/* Render Responsive Data Grid or Raw CSV */}
          <div className="border border-[#30363d] rounded-xl overflow-hidden bg-[#161b22] shadow-inner max-h-[380px] overflow-y-auto compact-scrollbar">
            {showRawCode ? (
              <div className="p-4 font-mono text-xs text-emerald-300/90 whitespace-pre-wrap leading-relaxed select-all">
                {csvContent}
              </div>
            ) : (
              <>
                {/* 1. STANDALONE TRANSACTIONS TABLE */}
                {selectedTable === 'transactions' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#0d1117] text-neutral-400 sticky top-0 z-10 border-b border-[#30363d] font-semibold">
                      <tr>
                        <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Дата' : 'Date'}</th>
                        <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Категория' : 'Category'}</th>
                        <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Счёт' : 'Account'}</th>
                        <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Комментарий' : 'Note'}</th>
                        <th className="p-2.5 sm:px-3.5 py-2.5 text-right">{lang === 'ru' ? 'Сумма' : 'Amount'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363d]/40">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-neutral-500 italic">
                            {lang === 'ru' ? 'Нет операций за выбранный период' : 'No transactions found for this period'}
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map(tx => {
                          const catMeta = getCategoryMeta(categories, tx.categoryId, t);
                          const acc = accounts.find(a => a.id === tx.accountId);
                          const isIncome = tx.type === 'income';

                          return (
                            <tr key={tx.id} className="hover:bg-[#30363d]/20 transition-colors">
                              <td className="p-2.5 sm:px-3.5 py-2 text-neutral-300 font-mono whitespace-nowrap">
                                {tx.date}
                              </td>
                              <td className="p-2.5 sm:px-3.5 py-2 font-medium text-neutral-200">
                                <div className="flex items-center gap-1.5">
                                  {catMeta.parentName && (
                                    <span className="text-[10px] text-neutral-400 bg-[#0d1117] px-1.5 py-0.5 rounded border border-[#30363d]">
                                      {catMeta.parentName}
                                    </span>
                                  )}
                                  <span>{catMeta.name}</span>
                                </div>
                              </td>
                              <td className="p-2.5 sm:px-3.5 py-2 text-neutral-300 whitespace-nowrap">
                                {acc ? acc.name : '—'}
                              </td>
                              <td className="p-2.5 sm:px-3.5 py-2 text-neutral-400 italic truncate max-w-[200px]">
                                {tx.note || '—'}
                              </td>
                              <td className={`p-2.5 sm:px-3.5 py-2 text-right font-mono font-semibold whitespace-nowrap ${isIncome ? 'text-emerald-400' : 'text-neutral-200'}`}>
                                {isIncome ? '+' : '-'}{formatMoney(tx.amount, currency, lang)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}

                {/* 2. STANDALONE ACCOUNTS TABLE */}
                {selectedTable === 'accounts' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#0d1117] text-neutral-400 sticky top-0 z-10 border-b border-[#30363d] font-semibold">
                      <tr>
                        <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Счёт' : 'Account'}</th>
                        <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Банк' : 'Bank'}</th>
                        <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Тип / Состояние' : 'Type / State'}</th>
                        <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Лимит карт' : 'Credit Limit'}</th>
                        <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Потрачено (долг)' : 'Spent (Debt)'}</th>
                        <th className="p-2.5 sm:px-3.5 py-2.5 text-right">{lang === 'ru' ? 'Доступно к трате' : 'Available'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363d]/40">
                      {accounts.map(acc => {
                        const isCredit = acc.type === 'credit';
                        const limit = acc.creditLimit || (isCredit ? acc.balance : 0);
                        const usedDebt = isCredit ? Math.max(0, limit - acc.balance) : (acc.type === 'debt' ? acc.balance : 0);

                        return (
                          <tr key={acc.id} className="hover:bg-[#30363d]/20 transition-colors">
                            <td className="p-2.5 sm:px-3.5 py-2 font-medium text-white">{acc.name}</td>
                            <td className="p-2.5 sm:px-3.5 py-2 text-neutral-300">{getBankName(acc.bank)}</td>
                            <td className="p-2.5 sm:px-3.5 py-2">
                              {isCredit ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-semibold text-amber-300 flex items-center gap-1">
                                    💳 {lang === 'ru' ? 'Кредитная карта' : 'Credit Card'}
                                  </span>
                                  <span className={`text-[10px] font-mono ${usedDebt === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {usedDebt === 0 
                                      ? (lang === 'ru' ? '✓ Лимит не тронут (долг 0)' : '✓ Limit untouched (debt 0)') 
                                      : (lang === 'ru' ? `Потрачено: ${formatMoney(usedDebt, currency, lang)}` : `Spent: ${formatMoney(usedDebt, currency, lang)}`)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-neutral-300">{getAccountTypeName(acc.type)}</span>
                              )}
                            </td>
                            <td className="p-2.5 sm:px-3.5 py-2 text-neutral-400 font-mono">
                              {isCredit ? formatMoney(limit, currency, lang) : '—'}
                            </td>
                            <td className="p-2.5 sm:px-3.5 py-2 font-mono">
                              {isCredit ? (
                                usedDebt === 0 ? (
                                  <span className="text-emerald-400 font-medium">0 {currency}</span>
                                ) : (
                                  <span className="text-red-400 font-semibold">{formatMoney(usedDebt, currency, lang)}</span>
                                )
                              ) : acc.type === 'debt' ? (
                                <span className="text-red-400 font-semibold">{formatMoney(acc.balance, currency, lang)}</span>
                              ) : (
                                <span className="text-neutral-500">—</span>
                              )}
                            </td>
                            <td className="p-2.5 sm:px-3.5 py-2 text-right font-mono font-semibold">
                              <span className={isCredit && usedDebt === 0 ? 'text-emerald-400' : 'text-neutral-100'}>
                                {formatMoney(acc.balance, currency, lang)}
                              </span>
                              {isCredit && (
                                <div className="text-[10px] text-neutral-400 font-normal">
                                  {lang === 'ru' ? 'доступно' : 'available'}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* 3. STANDALONE PAYMENTS TABLE */}
                {selectedTable === 'payments' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#0d1117] text-neutral-400 sticky top-0 z-10 border-b border-[#30363d] font-semibold">
                      <tr>
                        <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Платёж' : 'Payment'}</th>
                        <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Дата списания' : 'Date'}</th>
                        <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Периодичность' : 'Recurrence'}</th>
                        <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Счёт' : 'Account'}</th>
                        <th className="p-2.5 sm:px-3.5 py-2.5 text-right">{lang === 'ru' ? 'Сумма' : 'Amount'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363d]/40">
                      {payments.map(p => {
                        const acc = accounts.find(a => a.id === p.accountId);
                        return (
                          <tr key={p.id} className="hover:bg-[#30363d]/20 transition-colors">
                            <td className="p-2.5 sm:px-3.5 py-2 font-medium text-white">{p.name}</td>
                            <td className="p-2.5 sm:px-3.5 py-2 text-neutral-300 font-mono">{p.date || (lang === 'ru' ? 'Гибкая' : 'Flexible')}</td>
                            <td className="p-2.5 sm:px-3.5 py-2 text-neutral-400">{p.recurrence || 'monthly'}</td>
                            <td className="p-2.5 sm:px-3.5 py-2 text-neutral-300">{acc ? acc.name : '—'}</td>
                            <td className="p-2.5 sm:px-3.5 py-2 text-right font-mono font-semibold text-neutral-100">
                              {formatMoney(p.amount, currency, lang)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* 4. STANDALONE GOALS & PURCHASES TABLE */}
                {selectedTable === 'goals_purchases' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#0d1117] text-neutral-400 sticky top-0 z-10 border-b border-[#30363d] font-semibold">
                      <tr>
                        <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Тип' : 'Type'}</th>
                        <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Название' : 'Name'}</th>
                        <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Накоплено' : 'Saved'}</th>
                        <th className="p-2.5 sm:px-3.5 py-2.5 text-right">{lang === 'ru' ? 'Целевая сумма' : 'Target'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363d]/40">
                      {goals.map(g => (
                        <tr key={g.id} className="hover:bg-[#30363d]/20 transition-colors">
                          <td className="p-2.5 sm:px-3.5 py-2 text-emerald-400 font-medium">🎯 {lang === 'ru' ? 'Цель' : 'Goal'}</td>
                          <td className="p-2.5 sm:px-3.5 py-2 font-medium text-white">{g.name}</td>
                          <td className="p-2.5 sm:px-3.5 py-2 font-mono text-emerald-300">{formatMoney(g.savedAmount, currency, lang)}</td>
                          <td className="p-2.5 sm:px-3.5 py-2 text-right font-mono font-semibold text-neutral-100">
                            {formatMoney(g.targetAmount, currency, lang)}
                          </td>
                        </tr>
                      ))}
                      {purchases.map(p => (
                        <tr key={p.id} className="hover:bg-[#30363d]/20 transition-colors">
                          <td className="p-2.5 sm:px-3.5 py-2 text-blue-400 font-medium">🛍️ {lang === 'ru' ? 'Покупка' : 'Purchase'}</td>
                          <td className="p-2.5 sm:px-3.5 py-2 font-medium text-white">{p.name}</td>
                          <td className="p-2.5 sm:px-3.5 py-2 text-neutral-500">—</td>
                          <td className="p-2.5 sm:px-3.5 py-2 text-right font-mono font-semibold text-neutral-100">
                            {formatMoney(p.amount, currency, lang)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 5. FULL REPORT INTERACTIVE SUB-PREVIEW */}
                {selectedTable === 'full_report' && (
                  <>
                    {fullReportPreviewTab === 'transactions' && (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#0d1117] text-neutral-400 sticky top-0 z-10 border-b border-[#30363d] font-semibold">
                          <tr>
                            <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Дата' : 'Date'}</th>
                            <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Категория' : 'Category'}</th>
                            <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Счёт / Банк' : 'Account / Bank'}</th>
                            <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Комментарий' : 'Note'}</th>
                            <th className="p-2.5 sm:px-3.5 py-2.5 text-right">{lang === 'ru' ? 'Сумма' : 'Amount'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#30363d]/40">
                          {fullReportTransactions.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-neutral-500 italic">
                                {lang === 'ru' ? 'В базе нет операций' : 'No transactions recorded'}
                              </td>
                            </tr>
                          ) : (
                            fullReportTransactions.map(tx => {
                              const catMeta = getCategoryMeta(categories, tx.categoryId, t);
                              const acc = accounts.find(a => a.id === tx.accountId);
                              const isIncome = tx.type === 'income';

                              return (
                                <tr key={tx.id} className="hover:bg-[#30363d]/20 transition-colors">
                                  <td className="p-2.5 sm:px-3.5 py-2 text-neutral-300 font-mono whitespace-nowrap">
                                    {tx.date}
                                  </td>
                                  <td className="p-2.5 sm:px-3.5 py-2 font-medium text-neutral-200">
                                    <div className="flex items-center gap-1.5">
                                      {catMeta.parentName && (
                                        <span className="text-[10px] text-neutral-400 bg-[#0d1117] px-1.5 py-0.5 rounded border border-[#30363d]">
                                          {catMeta.parentName}
                                        </span>
                                      )}
                                      <span>{catMeta.name}</span>
                                    </div>
                                  </td>
                                  <td className="p-2.5 sm:px-3.5 py-2 text-neutral-300 whitespace-nowrap">
                                    {acc ? `${acc.name} (${getBankName(acc.bank)})` : '—'}
                                  </td>
                                  <td className="p-2.5 sm:px-3.5 py-2 text-neutral-400 italic truncate max-w-[200px]">
                                    {tx.note || '—'}
                                  </td>
                                  <td className={`p-2.5 sm:px-3.5 py-2 text-right font-mono font-semibold whitespace-nowrap ${isIncome ? 'text-emerald-400' : 'text-neutral-200'}`}>
                                    {isIncome ? '+' : '-'}{formatMoney(tx.amount, currency, lang)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    )}

                    {fullReportPreviewTab === 'accounts' && (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#0d1117] text-neutral-400 sticky top-0 z-10 border-b border-[#30363d] font-semibold">
                          <tr>
                            <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Счёт' : 'Account'}</th>
                            <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Банк' : 'Bank'}</th>
                            <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Тип / Статус' : 'Type / Status'}</th>
                            <th className="p-2.5 sm:px-3.5 py-2.5 text-right">{lang === 'ru' ? 'Доступно' : 'Available'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#30363d]/40">
                          {accounts.map(acc => {
                            const isCredit = acc.type === 'credit';
                            const limit = acc.creditLimit || (isCredit ? acc.balance : 0);
                            const usedDebt = isCredit ? Math.max(0, limit - acc.balance) : (acc.type === 'debt' ? acc.balance : 0);
                            return (
                              <tr key={acc.id} className="hover:bg-[#30363d]/20 transition-colors">
                                <td className="p-2.5 sm:px-3.5 py-2 font-medium text-white">{acc.name}</td>
                                <td className="p-2.5 sm:px-3.5 py-2 text-neutral-300">{getBankName(acc.bank)}</td>
                                <td className="p-2.5 sm:px-3.5 py-2 text-neutral-300">
                                  {isCredit ? (
                                    usedDebt === 0 ? <span className="text-emerald-400 font-medium">✓ Лимит не тронут (долг 0)</span> : <span className="text-amber-400 font-medium">Потрачено: {formatMoney(usedDebt, currency, lang)}</span>
                                  ) : getAccountTypeName(acc.type)}
                                </td>
                                <td className="p-2.5 sm:px-3.5 py-2 text-right font-mono font-semibold text-neutral-100">
                                  {formatMoney(acc.balance, currency, lang)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {fullReportPreviewTab === 'payments' && (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#0d1117] text-neutral-400 sticky top-0 z-10 border-b border-[#30363d] font-semibold">
                          <tr>
                            <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Платёж' : 'Payment'}</th>
                            <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Дата списания' : 'Date'}</th>
                            <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Счёт' : 'Account'}</th>
                            <th className="p-2.5 sm:px-3.5 py-2.5 text-right">{lang === 'ru' ? 'Сумма' : 'Amount'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#30363d]/40">
                          {payments.map(p => {
                            const acc = accounts.find(a => a.id === p.accountId);
                            return (
                              <tr key={p.id} className="hover:bg-[#30363d]/20 transition-colors">
                                <td className="p-2.5 sm:px-3.5 py-2 font-medium text-white">{p.name}</td>
                                <td className="p-2.5 sm:px-3.5 py-2 text-neutral-300 font-mono">{p.date || 'Flexible'}</td>
                                <td className="p-2.5 sm:px-3.5 py-2 text-neutral-300">{acc ? acc.name : '—'}</td>
                                <td className="p-2.5 sm:px-3.5 py-2 text-right font-mono font-semibold text-neutral-100">
                                  {formatMoney(p.amount, currency, lang)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {fullReportPreviewTab === 'goals_purchases' && (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#0d1117] text-neutral-400 sticky top-0 z-10 border-b border-[#30363d] font-semibold">
                          <tr>
                            <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Тип' : 'Type'}</th>
                            <th className="p-2.5 sm:px-3.5 py-2.5">{lang === 'ru' ? 'Название' : 'Name'}</th>
                            <th className="p-2.5 sm:px-3.5 py-2.5 text-right">{lang === 'ru' ? 'Сумма' : 'Amount'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#30363d]/40">
                          {goals.map(g => (
                            <tr key={g.id} className="hover:bg-[#30363d]/20 transition-colors">
                              <td className="p-2.5 sm:px-3.5 py-2 text-emerald-400 font-medium">🎯 {lang === 'ru' ? 'Цель' : 'Goal'}</td>
                              <td className="p-2.5 sm:px-3.5 py-2 font-medium text-white">{g.name}</td>
                              <td className="p-2.5 sm:px-3.5 py-2 text-right font-mono font-semibold text-neutral-100">
                                {formatMoney(g.targetAmount, currency, lang)}
                              </td>
                            </tr>
                          ))}
                          {purchases.map(p => (
                            <tr key={p.id} className="hover:bg-[#30363d]/20 transition-colors">
                              <td className="p-2.5 sm:px-3.5 py-2 text-blue-400 font-medium">🛍️ {lang === 'ru' ? 'Покупка' : 'Purchase'}</td>
                              <td className="p-2.5 sm:px-3.5 py-2 font-medium text-white">{p.name}</td>
                              <td className="p-2.5 sm:px-3.5 py-2 text-right font-mono font-semibold text-neutral-100">
                                {formatMoney(p.amount, currency, lang)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="p-4 sm:p-5 border-t border-[#30363d] bg-[#161b22] flex flex-col gap-3">
          {/* Action Feedback Banner */}
          <AnimatePresence>
            {statusMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 font-medium"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{statusMessage}</span>
                  </div>
                  {downloadPageUrl && (
                    <a
                      href={downloadPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-sky-300 hover:text-sky-200 underline flex items-center gap-1 shrink-0 ml-6 sm:ml-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{lang === 'ru' ? 'Открыть страницу скачивания ↗' : 'Open download page ↗'}</span>
                    </a>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {lang === 'ru' 
                  ? 'BOM UTF-8 заголовок включен для идеальной кириллицы в Excel' 
                  : 'BOM UTF-8 header included for clean character encoding'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
              {/* Option to download clean Excel Spreadsheet (.xls) for Full Report */}
              {selectedTable === 'full_report' && (
                <button
                  onClick={handleDownloadExcel}
                  className="px-3 py-2.5 bg-[#0d1117] hover:bg-[#21262d] border border-emerald-500/40 hover:border-emerald-500 text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  title={lang === 'ru' ? 'Скачать форматированную книгу Excel (.xls) со стилями и разделением на таблицы' : 'Download formatted Excel Workbook (.xls)'}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'ru' ? 'Книга Excel (.xls)' : 'Excel Book (.xls)'}</span>
                </button>
              )}

              {/* Option to batch-download all 4 tables as separate clean CSV files */}
              {selectedTable === 'full_report' && (
                <button
                  onClick={handleBatchDownloadAllTables}
                  disabled={batchDownloading}
                  className="px-3 py-2.5 bg-[#0d1117] hover:bg-[#21262d] border border-blue-500/40 hover:border-blue-500 text-blue-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  title={lang === 'ru' ? 'Скачать 4 отдельных чистых CSV файла (Операции, Счета, Платежи, Цели) — без смешения колонок' : 'Download all 4 tables as separate clean CSV files'}
                >
                  <Package className="w-3.5 h-3.5 text-blue-400" />
                  <span>{batchDownloading ? (lang === 'ru' ? 'Скачивание...' : 'Downloading...') : (lang === 'ru' ? 'Комплект (4 файла CSV)' : 'Package (4 CSVs)')}</span>
                </button>
              )}

              <button
                onClick={() => setShowRawCode(prev => !prev)}
                className={`px-3 py-2.5 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  showRawCode 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-[#0d1117] hover:bg-[#21262d] border-[#30363d] text-neutral-300 hover:text-white'
                }`}
                title={lang === 'ru' ? 'Показать / скрыть полный текст CSV для ручного копирования' : 'Toggle raw CSV code view'}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>{showRawCode ? (lang === 'ru' ? 'Табличный вид' : 'Table View') : (lang === 'ru' ? 'Текст CSV' : 'Raw Text')}</span>
              </button>

              <button
                onClick={handleCopyRawCsv}
                className="px-3 py-2.5 bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] text-neutral-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                title={lang === 'ru' ? 'Скопировать текст в формате CSV' : 'Copy raw CSV content'}
              >
                {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCsv ? (lang === 'ru' ? 'CSV скопирован!' : 'CSV Copied!') : (lang === 'ru' ? 'Скопировать CSV' : 'Copy CSV')}</span>
              </button>

              <button
                onClick={handleCopyTsv}
                className="px-3 py-2.5 bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] text-neutral-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                title={lang === 'ru' ? 'Скопировать таблицу для прямой вставки через Ctrl+V в Excel или Google Таблицы' : 'Copy table cells for pasting into Excel/Sheets'}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{copied ? (lang === 'ru' ? 'Таблица скопирована!' : 'Table Copied!') : (lang === 'ru' ? 'Для Excel (Ctrl+V)' : 'Copy for Excel')}</span>
              </button>

              <button
                onClick={() => openDownloadPage()}
                className="px-3 py-2.5 bg-[#0d1117] hover:bg-[#21262d] border border-sky-500/40 hover:border-sky-500 text-sky-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                title={lang === 'ru' ? 'Открыть отдельную страницу загрузки в новой вкладке браузера' : 'Open dedicated download page in new browser tab'}
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'ru' ? 'В новой вкладке' : 'In New Tab'}</span>
              </button>

              <a
                href={downloadBlobUrl || downloadDataUri || '#'}
                download={downloadFilename}
                onClick={handleDownload}
                className="px-4 sm:px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-neutral-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] cursor-pointer no-underline select-none"
                title={lang === 'ru' ? 'Нажмите для сохранения файла на диск и открытия страницы загрузки' : 'Click to download file and open download page'}
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-neutral-950" />
                    <span>{lang === 'ru' ? 'Загрузка...' : 'Downloading...'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-neutral-950" />
                    <span>{lang === 'ru' ? 'Скачать .CSV файл' : 'Download .CSV'}</span>
                  </>
                )}
              </a>
            </div>
          </div>

          {/* Quick Fallback Note */}
          <div className="text-[11px] text-neutral-500 text-center sm:text-left flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">💡</span>
            <span>
              {lang === 'ru' 
                ? 'Для подробного анализа полного отчёта в Excel вы можете использовать кнопку «Книга Excel (.xls)» (раздельные таблицы со стилями), «Комплект (4 файла CSV)» или обычный «Скачать .CSV файл».'
                : 'For detailed spreadsheet analysis, you can use "Excel Book (.xls)", "Package (4 CSVs)", or standard "Download .CSV".'}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

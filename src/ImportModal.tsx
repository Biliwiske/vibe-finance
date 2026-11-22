import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, 
  ArrowRight, RefreshCw, FileText, Database, Layers, Check, 
  Wallet, CalendarDays, PiggyBank, Table, HelpCircle, FileCheck, Info
} from 'lucide-react';
import { Account, Payment, Goal, Purchase, Transaction, Category } from './types';
import { formatMoney } from './utils';
import { FULL_BANKS } from './TransactionForms';

interface ImportModalProps {
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
  onImport: (payload: {
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
    accounts: number;
    transactions: number;
    payments: number;
    goals: number;
    purchases: number;
    categories: number;
  };
}

export type DetectedFormat = 
  | 'transactions' 
  | 'accounts' 
  | 'payments' 
  | 'goals_purchases' 
  | 'full_report' 
  | 'json_backup' 
  | 'generic_csv'
  | 'unknown';

interface ParsedImportData {
  format: DetectedFormat;
  formatTitle: string;
  filename: string;
  filesize: number;
  accounts: Account[];
  transactions: Transaction[];
  payments: Payment[];
  goals: Goal[];
  purchases: Purchase[];
  categories: Category[];
  salary?: number;
  warnings: string[];
  rawRowCount: number;
  previewRows: Array<{
    col1: string;
    col2: string;
    col3: string;
    col4: string;
    col5: string;
    badge?: string;
    isIncome?: boolean;
    isExpense?: boolean;
  }>;
}

// RFC-4180 CSV Tokenizer & Parser
function parseCsvToMatrix(text: string): { rows: string[][]; detectedDelimiter: string } {
  // Strip BOM if present
  let cleanText = text.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return { rows: [], detectedDelimiter: ',' };

  // Detect delimiter based on first non-empty lines
  const sampleLines = cleanText.split(/\r?\n/).slice(0, 5);
  let semiCount = 0;
  let commaCount = 0;
  let tabCount = 0;

  sampleLines.forEach(line => {
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') inQuotes = !inQuotes;
      else if (!inQuotes) {
        if (line[i] === ';') semiCount++;
        else if (line[i] === ',') commaCount++;
        else if (line[i] === '\t') tabCount++;
      }
    }
  });

  let delimiter = ',';
  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++; // handle CRLF
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return { rows, detectedDelimiter: delimiter };
}

// Clean number parser handling Russian and US decimals, spaces, currency symbols
function parseAmount(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let s = String(val).trim();
  s = s.replace(/[\s\u00A0₽$€£%]/g, '');
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // 1.234,56
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

// Clean date parser returning YYYY-MM-DD
function parseIsoDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  
  const ruMatch = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (ruMatch) {
    return `${ruMatch[3]}-${ruMatch[2].padStart(2, '0')}-${ruMatch[1].padStart(2, '0')}`;
  }

  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

  return new Date().toISOString().split('T')[0];
}

// Bank resolver
function resolveBank(bankStr?: string): string {
  if (!bankStr) return 'none';
  const s = bankStr.toLowerCase().trim();
  if (s.includes('тинькофф') || s.includes('т-банк') || s.includes('tinkoff')) return 'tinkoff';
  if (s.includes('сбер') || s.includes('sber')) return 'sberbank';
  if (s.includes('альфа') || s.includes('alfa')) return 'alfa';
  if (s.includes('озон') || s.includes('ozon')) return 'ozon';
  if (s.includes('втб') || s.includes('vtb')) return 'vtb';
  if (s.includes('яндекс') || s.includes('yandex')) return 'yandex';
  if (s.includes('совком') || s.includes('sovcom')) return 'sovcom';
  if (s.includes('райффайзен') || s.includes('raiffeisen')) return 'raiffeisen';
  if (s.includes('газпром') || s.includes('gazprom')) return 'gazprom';
  if (s.includes('revolut')) return 'revolut';
  return 'none';
}

// Account type resolver
function resolveAccountType(typeStr?: string): Account['type'] {
  if (!typeStr) return 'checking';
  const s = typeStr.toLowerCase().trim();
  if (s.includes('кредитн') || s.includes('credit')) return 'credit';
  if (s.includes('накопительн') || s.includes('saving')) return 'savings';
  if (s.includes('вклад') || s.includes('deposit')) return 'deposit';
  if (s.includes('наличн') || s.includes('cash')) return 'cash';
  if (s.includes('крипт') || s.includes('crypto')) return 'crypto';
  if (s.includes('долг') || s.includes('займ') || s.includes('debt') || s.includes('loan')) return 'debt';
  return 'checking';
}

// Recurrence resolver
function resolveRecurrence(recStr?: string): Transaction['recurrence'] {
  if (!recStr) return 'none';
  const s = recStr.toLowerCase().trim();
  if (s.includes('недел') || s.includes('week')) return 'weekly';
  if (s.includes('месяц') || s.includes('month')) return 'monthly';
  if (s.includes('год') || s.includes('year')) return 'yearly';
  return 'none';
}

export function ImportModal({
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
  onImport
}: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [pastedText, setPastedText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedImportData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [skipBalanceUpdate, setSkipBalanceUpdate] = useState<boolean>(true);
  const [autoCreateEntities, setAutoCreateEntities] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccess, setImportSuccess] = useState<null | {
    accounts: number;
    transactions: number;
    payments: number;
    goals: number;
    purchases: number;
    categories: number;
  }>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset states on open/close
  React.useEffect(() => {
    if (isOpen) {
      setParsedData(null);
      setPastedText('');
      setImportSuccess(null);
      setErrorMsg(null);
      setImportMode('merge');
      setSkipBalanceUpdate(true);
      setAutoCreateEntities(true);
    }
  }, [isOpen]);

  // Find category ID by name/subcat
  const matchCategory = (
    mainCatStr?: string, 
    subCatStr?: string, 
    type: 'income' | 'expense' = 'expense',
    existingCats: Category[] = categories
  ): string => {
    const main = (mainCatStr || '').trim().toLowerCase();
    const sub = (subCatStr || '').trim().toLowerCase();

    // 1. Try matching subcategory first
    if (sub) {
      const subMatch = existingCats.find(c => 
        c.type === type && (
          c.name.toLowerCase() === sub ||
          t(c.name).toLowerCase() === sub ||
          c.id.toLowerCase() === sub
        )
      );
      if (subMatch) return subMatch.id;
    }

    // 2. Try matching main category
    if (main) {
      // Check if it's "Food • Supermarkets" in single string
      if (main.includes('•') || main.includes('/')) {
        const parts = main.split(/[•/]/).map(p => p.trim().toLowerCase());
        for (const part of parts.reverse()) {
          const partMatch = existingCats.find(c => 
            c.type === type && (
              c.name.toLowerCase() === part ||
              t(c.name).toLowerCase() === part ||
              c.id.toLowerCase() === part
            )
          );
          if (partMatch) return partMatch.id;
        }
      }

      const mainMatch = existingCats.find(c => 
        c.type === type && (
          c.name.toLowerCase() === main ||
          t(c.name).toLowerCase() === main ||
          c.id.toLowerCase() === main
        )
      );
      if (mainMatch) {
        // If it has a default subcategory, prefer that if possible
        if (mainMatch.isParent) {
          const child = existingCats.find(c => c.parentId === mainMatch.id);
          if (child) return child.id;
        }
        return mainMatch.id;
      }
    }

    // Default fallback
    return type === 'income' ? '1' : 'exp_other';
  };

  // Find or stage account
  const resolveAccount = (
    accName: string, 
    bankName?: string, 
    typeName?: string, 
    stagedAccounts: Account[] = []
  ): { accountId: string; newAccount?: Account } => {
    const cleanName = (accName || '').trim();
    if (!cleanName || cleanName === 'Не указан' || cleanName === 'None' || cleanName === '—') {
      const defaultAcc = accounts[0] || stagedAccounts[0];
      return { accountId: defaultAcc ? defaultAcc.id : 'default' };
    }

    // Check existing
    const foundExisting = accounts.find(a => a.name.toLowerCase().trim() === cleanName.toLowerCase());
    if (foundExisting) return { accountId: foundExisting.id };

    // Check staged in this file
    const foundStaged = stagedAccounts.find(a => a.name.toLowerCase().trim() === cleanName.toLowerCase());
    if (foundStaged) return { accountId: foundStaged.id };

    // Auto-create new account
    const newAcc: Account = {
      id: crypto.randomUUID(),
      name: cleanName,
      bank: resolveBank(bankName),
      type: resolveAccountType(typeName),
      balance: 0
    };
    return { accountId: newAcc.id, newAccount: newAcc };
  };

  // Core parser supporting JSON, full report CSV, and table CSVs from Vibe Finance
  const processRawInput = (rawText: string, filename: string = 'import.csv', filesize: number = 0): ParsedImportData | null => {
    setErrorMsg(null);
    const text = rawText.trim();
    if (!text) {
      setErrorMsg(lang === 'ru' ? 'Файл или текст пуст' : 'File or text is empty');
      return null;
    }

    const warnings: string[] = [];

    // ==========================================
    // 1. Check if JSON Backup
    // ==========================================
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const json = JSON.parse(text);
        const stagedAccounts: Account[] = Array.isArray(json.accounts) ? json.accounts : [];
        const stagedTransactions: Transaction[] = Array.isArray(json.transactions) ? json.transactions : [];
        const stagedPayments: Payment[] = Array.isArray(json.payments) ? json.payments : [];
        const stagedGoals: Goal[] = Array.isArray(json.goals) ? json.goals : [];
        const stagedPurchases: Purchase[] = Array.isArray(json.purchases) ? json.purchases : [];
        const stagedCategories: Category[] = Array.isArray(json.categories) ? json.categories : [];
        const salaryVal = typeof json.salary === 'number' ? json.salary : undefined;

        const previewRows = stagedTransactions.slice(0, 10).map(tx => ({
          col1: tx.date,
          col2: tx.type === 'income' ? (lang === 'ru' ? 'Доход' : 'Income') : (lang === 'ru' ? 'Расход' : 'Expense'),
          col3: formatMoney(tx.amount, currency, lang),
          col4: (categories.find(c => c.id === tx.categoryId)?.name ? t(categories.find(c => c.id === tx.categoryId)!.name) : 'Категория'),
          col5: tx.note || (accounts.find(a => a.id === tx.accountId)?.name || '—'),
          isIncome: tx.type === 'income',
          isExpense: tx.type === 'expense'
        }));

        return {
          format: 'json_backup',
          formatTitle: lang === 'ru' ? 'Полный бэкап Vibe Finance (JSON)' : 'Vibe Finance Backup (JSON)',
          filename,
          filesize: filesize || text.length,
          accounts: stagedAccounts,
          transactions: stagedTransactions,
          payments: stagedPayments,
          goals: stagedGoals,
          purchases: stagedPurchases,
          categories: stagedCategories,
          salary: salaryVal,
          warnings,
          rawRowCount: stagedTransactions.length + stagedAccounts.length + stagedPayments.length,
          previewRows
        };
      } catch (e: any) {
        // Not valid JSON, continue to CSV parser
      }
    }

    // ==========================================
    // 2. Parse Delimited CSV / TSV
    // ==========================================
    const { rows } = parseCsvToMatrix(text);
    if (rows.length === 0) {
      setErrorMsg(lang === 'ru' ? 'Не удалось прочитать строки в CSV' : 'Could not parse rows in CSV');
      return null;
    }

    const firstRowStr = rows[0].join(' ').toLowerCase();

    // ==========================================
    // CASE A: FULL REPORT CSV (Vibe Finance Report)
    // ==========================================
    const isFullReport = text.includes('VIBE FINANCE') || text.includes('ФИНАНСОВЫЙ ОТЧЁТ') || text.includes('--- 1.') || text.includes('--- 2.');
    if (isFullReport) {
      const stagedAccounts: Account[] = [];
      const stagedPayments: Payment[] = [];
      const stagedGoals: Goal[] = [];
      const stagedPurchases: Purchase[] = [];
      const stagedTransactions: Transaction[] = [];
      let parsedSalary: number | undefined;

      let currentSection: 'none' | 'accounts' | 'payments' | 'goals_purchases' | 'transactions' = 'none';

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;
        const lineStr = row[0].toLowerCase();

        // Check for section transitions
        if (lineStr.includes('--- 1.') || lineStr.includes('счета и накопления') || lineStr.includes('accounts & balances')) {
          currentSection = 'accounts';
          i++; // skip header line
          continue;
        } else if (lineStr.includes('--- 2.') || lineStr.includes('регулярные платежи') || lineStr.includes('recurring payments')) {
          currentSection = 'payments';
          i++; // skip header line
          continue;
        } else if (lineStr.includes('--- 3.') || lineStr.includes('цели и планируемые') || lineStr.includes('goals & purchases')) {
          currentSection = 'goals_purchases';
          i++; // skip header line
          continue;
        } else if (lineStr.includes('--- 4.') || lineStr.includes('журнал операций') || lineStr.includes('transactions journal')) {
          currentSection = 'transactions';
          i++; // skip header line
          continue;
        }

        // Check salary in header
        if (lineStr.includes('базовая зарплата') || lineStr.includes('monthly salary')) {
          parsedSalary = parseAmount(row[1]);
          continue;
        }

        if (currentSection === 'accounts' && row.length >= 4) {
          // [Name, Bank, Type, Balance, Limit, Rate, Currency]
          const name = row[0];
          if (!name || name.toLowerCase().includes('название') || name.toLowerCase().includes('name')) continue;
          const bank = resolveBank(row[1]);
          const type = resolveAccountType(row[2]);
          const balance = parseAmount(row[3]);
          const limit = row[4] ? parseAmount(row[4]) : undefined;
          const rate = row[5] ? parseAmount(row[5]) : undefined;

          stagedAccounts.push({
            id: crypto.randomUUID(),
            name,
            bank,
            type,
            balance,
            creditLimit: limit,
            interestRate: rate
          });
        } 
        else if (currentSection === 'payments' && row.length >= 2) {
          // [Payment, Amount, Recurrence, Date, Account]
          const name = row[0];
          if (!name || name.toLowerCase().includes('платёж') || name.toLowerCase().includes('payment')) continue;
          const amount = parseAmount(row[1]);
          const rec = resolveRecurrence(row[2]);
          const date = row[3] || '15';
          const accName = row[4] || '';
          const { accountId, newAccount } = resolveAccount(accName, undefined, undefined, stagedAccounts);
          if (newAccount) stagedAccounts.push(newAccount);

          stagedPayments.push({
            id: crypto.randomUUID(),
            name,
            amount,
            recurrence: rec,
            date,
            accountId,
            isActive: true
          });
        }
        else if (currentSection === 'goals_purchases' && row.length >= 2) {
          const name = row[0];
          if (!name || name.toLowerCase().includes('цель / покупка') || name.toLowerCase().includes('goal / purchase')) continue;
          const targetAmount = parseAmount(row[1]);

          if (name.startsWith('[Покупка]') || name.startsWith('[Purchase]')) {
            stagedPurchases.push({
              id: crypto.randomUUID(),
              name: name.replace(/^\[(Покупка|Purchase)\]\s*/i, '').trim(),
              amount: targetAmount
            });
          } else {
            const savedAmount = parseAmount(row[2]);
            const monthly = parseAmount(row[3]);
            stagedGoals.push({
              id: crypto.randomUUID(),
              name,
              targetAmount,
              savedAmount,
              monthlyContribution: monthly
            });
          }
        }
        else if (currentSection === 'transactions' && row.length >= 3) {
          // Skip header row or summary info rows
          const firstCell = (row[0] || '').toLowerCase();
          if (firstCell.includes('дата') || firstCell.includes('date') || firstCell.includes('всего') || firstCell.includes('total') || firstCell.includes('---')) {
            continue;
          }

          // [Date, Type, Amount, Category, Account, Note, (optional: Currency, MainCat, SubCat, Bank, Tracking)]
          const date = parseIsoDate(row[0]);
          const typeStr = (row[1] || '').toLowerCase();
          const isIncome = typeStr.includes('доход') || typeStr.includes('income') || typeStr.includes('+');
          const type: 'income' | 'expense' = isIncome ? 'income' : 'expense';
          const amount = parseAmount(row[2]);
          
          // Detect category and subcategory from available columns
          const catStr = row[3] || '';
          const subCatStr = row.length >= 9 && row[8] ? row[8] : undefined;
          const mainCatStr = row.length >= 8 && row[7] ? row[7] : catStr;
          
          const accStr = row[4] || '';
          const bankStr = row.length >= 10 && row[9] ? row[9] : undefined;
          const note = row[5] || '';

          const categoryId = matchCategory(mainCatStr, subCatStr, type, categories);
          const { accountId, newAccount } = resolveAccount(accStr, bankStr ? resolveBank(bankStr) : undefined, undefined, stagedAccounts);
          if (newAccount) stagedAccounts.push(newAccount);

          stagedTransactions.push({
            id: crypto.randomUUID(),
            date,
            type,
            amount,
            categoryId,
            accountId,
            note
          });
        }
      }

      const previewRows = stagedTransactions.slice(0, 10).map(tx => ({
        col1: tx.date,
        col2: tx.type === 'income' ? (lang === 'ru' ? 'Доход' : 'Income') : (lang === 'ru' ? 'Расход' : 'Expense'),
        col3: formatMoney(tx.amount, currency, lang),
        col4: (categories.find(c => c.id === tx.categoryId)?.name ? t(categories.find(c => c.id === tx.categoryId)!.name) : 'Категория'),
        col5: tx.note || (stagedAccounts.find(a => a.id === tx.accountId)?.name || accounts.find(a => a.id === tx.accountId)?.name || '—'),
        isIncome: tx.type === 'income',
        isExpense: tx.type === 'expense'
      }));

      return {
        format: 'full_report',
        formatTitle: lang === 'ru' ? 'Полный отчёт Vibe Finance (CSV)' : 'Vibe Finance Full Report (CSV)',
        filename,
        filesize: filesize || text.length,
        accounts: stagedAccounts,
        transactions: stagedTransactions,
        payments: stagedPayments,
        goals: stagedGoals,
        purchases: stagedPurchases,
        categories: [],
        salary: parsedSalary,
        warnings,
        rawRowCount: rows.length,
        previewRows
      };
    }

    // ==========================================
    // CASE B: DETECT WHICH SPECIFIC TABLE CSV
    // ==========================================
    const headerRow = rows[0].map(h => h.toLowerCase().trim());
    const headerRowStr = headerRow.join('|');

    // B1: ACCOUNTS CSV
    // "Название счёта", "Банк", "Тип", "Текущий баланс", "Кредитный лимит"
    if (headerRowStr.includes('название счёта') || headerRowStr.includes('account name') || headerRowStr.includes('кредитный лимит') || headerRowStr.includes('credit limit')) {
      const nameIdx = headerRow.findIndex(h => h.includes('название') || h.includes('account'));
      const bankIdx = headerRow.findIndex(h => h.includes('банк') || h.includes('bank'));
      const typeIdx = headerRow.findIndex(h => h.includes('тип') || h.includes('type'));
      const balIdx = headerRow.findIndex(h => h.includes('баланс') || h.includes('balance'));
      const limitIdx = headerRow.findIndex(h => h.includes('лимит') || h.includes('limit'));
      const rateIdx = headerRow.findIndex(h => h.includes('ставка') || h.includes('rate') || h.includes('%'));
      const graceIdx = headerRow.findIndex(h => h.includes('льготн') || h.includes('grace'));

      const stagedAccounts: Account[] = [];

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (r.length < 2) continue;
        const name = r[nameIdx >= 0 ? nameIdx : 0];
        if (!name) continue;

        const bank = resolveBank(bankIdx >= 0 ? r[bankIdx] : undefined);
        const type = resolveAccountType(typeIdx >= 0 ? r[typeIdx] : undefined);
        const balance = parseAmount(balIdx >= 0 ? r[balIdx] : r[3]);
        const creditLimit = limitIdx >= 0 && r[limitIdx] ? parseAmount(r[limitIdx]) : undefined;
        const interestRate = rateIdx >= 0 && r[rateIdx] ? parseAmount(r[rateIdx]) : undefined;
        const gracePeriodDays = graceIdx >= 0 && r[graceIdx] ? parseInt(r[graceIdx]) : undefined;

        stagedAccounts.push({
          id: crypto.randomUUID(),
          name,
          bank,
          type,
          balance,
          creditLimit,
          interestRate,
          gracePeriodDays
        });
      }

      const previewRows = stagedAccounts.slice(0, 10).map(acc => ({
        col1: acc.name,
        col2: FULL_BANKS.find(b => b.id === acc.bank)?.name || acc.bank || '—',
        col3: formatMoney(acc.balance, currency, lang),
        col4: acc.type || 'checking',
        col5: acc.creditLimit ? `Лимит: ${formatMoney(acc.creditLimit, currency, lang)}` : '',
        badge: acc.type
      }));

      return {
        format: 'accounts',
        formatTitle: lang === 'ru' ? 'Счета и карты (CSV)' : 'Accounts & Cards (CSV)',
        filename,
        filesize: filesize || text.length,
        accounts: stagedAccounts,
        transactions: [],
        payments: [],
        goals: [],
        purchases: [],
        categories: [],
        warnings,
        rawRowCount: rows.length - 1,
        previewRows
      };
    }

    // B2: PAYMENTS CSV
    // "Название платежа", "Сумма", "Валюта", "Дата списания", "Периодичность", "Тип расхода", "Счёт"
    if (headerRowStr.includes('название платежа') || headerRowStr.includes('payment name') || (headerRowStr.includes('платёж') && headerRowStr.includes('списания'))) {
      const nameIdx = headerRow.findIndex(h => h.includes('название') || h.includes('name') || h.includes('платёж'));
      const amountIdx = headerRow.findIndex(h => h.includes('сумма') || h.includes('amount'));
      const dateIdx = headerRow.findIndex(h => h.includes('дата') || h.includes('due') || h.includes('date'));
      const recIdx = headerRow.findIndex(h => h.includes('периодич') || h.includes('recurrence'));
      const flexIdx = headerRow.findIndex(h => h.includes('тип расхода') || h.includes('expense type'));
      const accIdx = headerRow.findIndex(h => h.includes('счёт') || h.includes('account'));
      const statusIdx = headerRow.findIndex(h => h.includes('статус') || h.includes('status'));

      const stagedPayments: Payment[] = [];
      const stagedAccounts: Account[] = [];

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (r.length < 2) continue;
        const name = r[nameIdx >= 0 ? nameIdx : 0];
        if (!name) continue;

        const amount = parseAmount(amountIdx >= 0 ? r[amountIdx] : r[1]);
        const date = dateIdx >= 0 ? r[dateIdx] : '15';
        const rec = resolveRecurrence(recIdx >= 0 ? r[recIdx] : undefined);
        const isFlexible = flexIdx >= 0 ? r[flexIdx]?.toLowerCase().includes('гибк') : false;
        const accName = accIdx >= 0 ? r[accIdx] : '';
        const { accountId, newAccount } = resolveAccount(accName, undefined, undefined, stagedAccounts);
        if (newAccount) stagedAccounts.push(newAccount);

        const statusStr = statusIdx >= 0 ? r[statusIdx]?.toLowerCase() : '';
        const isActive = !(statusStr?.includes('отключ') || statusStr?.includes('disable') || statusStr?.includes('inactiv'));

        stagedPayments.push({
          id: crypto.randomUUID(),
          name,
          amount,
          date,
          recurrence: rec,
          isFlexible,
          accountId,
          isActive
        });
      }

      const previewRows = stagedPayments.slice(0, 10).map(p => ({
        col1: p.name,
        col2: formatMoney(p.amount, currency, lang),
        col3: p.recurrence || 'monthly',
        col4: `День: ${p.date || '—'}`,
        col5: p.isActive ? 'Активен' : 'Отключен'
      }));

      return {
        format: 'payments',
        formatTitle: lang === 'ru' ? 'Регулярные платежи (CSV)' : 'Recurring Payments (CSV)',
        filename,
        filesize: filesize || text.length,
        accounts: stagedAccounts,
        transactions: [],
        payments: stagedPayments,
        goals: [],
        purchases: [],
        categories: [],
        warnings,
        rawRowCount: rows.length - 1,
        previewRows
      };
    }

    // B3: GOALS & PURCHASES CSV
    // "Раздел", "Название", "Целевая / Полная сумма", "Уже накоплено", "Остаток", "Ежемесячный взнос"
    if (headerRowStr.includes('раздел') || headerRowStr.includes('целевая') || headerRowStr.includes('цели и покупки') || (headerRowStr.includes('цель') && headerRowStr.includes('накоплено'))) {
      const secIdx = headerRow.findIndex(h => h.includes('раздел') || h.includes('section'));
      const nameIdx = headerRow.findIndex(h => h.includes('название') || h.includes('name'));
      const targetIdx = headerRow.findIndex(h => h.includes('целев') || h.includes('target') || h.includes('полная'));
      const savedIdx = headerRow.findIndex(h => h.includes('накоплено') || h.includes('saved'));
      const monthlyIdx = headerRow.findIndex(h => h.includes('взнос') || h.includes('monthly') || h.includes('contribution'));

      const stagedGoals: Goal[] = [];
      const stagedPurchases: Purchase[] = [];

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (r.length < 2) continue;
        const section = (secIdx >= 0 ? r[secIdx] : '').toLowerCase();
        const name = r[nameIdx >= 0 ? nameIdx : 1];
        if (!name) continue;

        const isPurchase = section.includes('покупк') || section.includes('purchase');
        const targetAmount = parseAmount(targetIdx >= 0 ? r[targetIdx] : r[2]);

        if (isPurchase) {
          stagedPurchases.push({
            id: crypto.randomUUID(),
            name,
            amount: targetAmount
          });
        } else {
          const savedAmount = parseAmount(savedIdx >= 0 ? r[savedIdx] : r[3]);
          const monthly = parseAmount(monthlyIdx >= 0 ? r[monthlyIdx] : r[5]);
          stagedGoals.push({
            id: crypto.randomUUID(),
            name,
            targetAmount,
            savedAmount,
            monthlyContribution: monthly
          });
        }
      }

      const previewRows = [
        ...stagedGoals.map(g => ({
          col1: `🎯 ${g.name}`,
          col2: formatMoney(g.targetAmount, currency, lang),
          col3: `Накоплено: ${formatMoney(g.savedAmount, currency, lang)}`,
          col4: `Взнос: ${formatMoney(g.monthlyContribution, currency, lang)}/мес`,
          col5: 'Финансовая цель'
        })),
        ...stagedPurchases.map(p => ({
          col1: `🛍️ ${p.name}`,
          col2: formatMoney(p.amount, currency, lang),
          col3: '—',
          col4: '—',
          col5: 'Крупная покупка'
        }))
      ].slice(0, 10);

      return {
        format: 'goals_purchases',
        formatTitle: lang === 'ru' ? 'Цели и покупки (CSV)' : 'Goals & Purchases (CSV)',
        filename,
        filesize: filesize || text.length,
        accounts: [],
        transactions: [],
        payments: [],
        goals: stagedGoals,
        purchases: stagedPurchases,
        categories: [],
        warnings,
        rawRowCount: rows.length - 1,
        previewRows
      };
    }

    // B4: TRANSACTIONS CSV (Default / Vibe Finance Transactions)
    // "Дата", "Тип операции", "Сумма", "Валюта", "Основная категория", "Подкатегория", "Счёт", "Банк", "Комментарий", "Учёт в балансе"
    const dateIdx = headerRow.findIndex(h => h.includes('дата') || h.includes('date'));
    const typeIdx = headerRow.findIndex(h => h.includes('тип') || h.includes('type'));
    const amountIdx = headerRow.findIndex(h => h.includes('сумма') || h.includes('amount'));
    const mainCatIdx = headerRow.findIndex(h => h.includes('основная категория') || h.includes('main category') || h.includes('категория') || h.includes('category'));
    const subCatIdx = headerRow.findIndex(h => h.includes('подкатегория') || h.includes('subcategory'));
    const accIdx = headerRow.findIndex(h => h.includes('счёт') || h.includes('account'));
    const bankIdx = headerRow.findIndex(h => h.includes('банк') || h.includes('bank'));
    const accTypeIdx = headerRow.findIndex(h => h.includes('тип счёта') || h.includes('account type'));
    const noteIdx = headerRow.findIndex(h => h.includes('комментарий') || h.includes('note') || h.includes('описание') || h.includes('description'));
    const balanceTrackingIdx = headerRow.findIndex(h => h.includes('баланс') || h.includes('tracking') || h.includes('учёт'));

    const stagedTransactions: Transaction[] = [];
    const stagedAccounts: Account[] = [];

    const startRow = dateIdx >= 0 || amountIdx >= 0 ? 1 : 0;

    for (let i = startRow; i < rows.length; i++) {
      const r = rows[i];
      if (r.length < 2) continue;

      const dateRaw = dateIdx >= 0 ? r[dateIdx] : r[0];
      const date = parseIsoDate(dateRaw);

      let amount = parseAmount(amountIdx >= 0 ? r[amountIdx] : r[2]);
      
      const typeStr = (typeIdx >= 0 ? r[typeIdx] : '').toLowerCase();
      let isIncome = typeStr.includes('доход') || typeStr.includes('income') || typeStr.includes('+');
      let isExpense = typeStr.includes('расход') || typeStr.includes('expense') || typeStr.includes('-');

      // If no explicit type column, infer from sign
      if (!isIncome && !isExpense) {
        const rawAmountStr = amountIdx >= 0 ? r[amountIdx] : r[2];
        if (rawAmountStr && rawAmountStr.includes('-')) isExpense = true;
        else if (rawAmountStr && rawAmountStr.includes('+')) isIncome = true;
        else isExpense = true;
      }

      const type: 'income' | 'expense' = isIncome ? 'income' : 'expense';
      amount = Math.abs(amount);

      const mainCat = mainCatIdx >= 0 ? r[mainCatIdx] : '';
      const subCat = subCatIdx >= 0 ? r[subCatIdx] : '';
      const categoryId = matchCategory(mainCat, subCat, type, categories);

      const accName = accIdx >= 0 ? r[accIdx] : '';
      const bankName = bankIdx >= 0 ? r[bankIdx] : '';
      const accTypeName = accTypeIdx >= 0 ? r[accTypeIdx] : '';
      const { accountId, newAccount } = resolveAccount(accName, bankName, accTypeName, stagedAccounts);
      if (newAccount) stagedAccounts.push(newAccount);

      const note = noteIdx >= 0 ? r[noteIdx] : '';
      
      const trackingStr = (balanceTrackingIdx >= 0 ? r[balanceTrackingIdx] : '').toLowerCase();
      const skipBal = trackingStr.includes('архив') || trackingStr.includes('no balance');

      stagedTransactions.push({
        id: crypto.randomUUID(),
        date,
        type,
        amount,
        categoryId,
        accountId,
        note,
        skipBalanceUpdate: skipBal
      });
    }

    const previewRows = stagedTransactions.slice(0, 10).map(tx => {
      const cat = categories.find(c => c.id === tx.categoryId);
      const catName = cat ? t(cat.name) : 'Категория';
      const acc = stagedAccounts.find(a => a.id === tx.accountId) || accounts.find(a => a.id === tx.accountId);
      return {
        col1: tx.date,
        col2: tx.type === 'income' ? (lang === 'ru' ? 'Доход' : 'Income') : (lang === 'ru' ? 'Расход' : 'Expense'),
        col3: formatMoney(tx.amount, currency, lang),
        col4: catName,
        col5: tx.note || (acc ? acc.name : '—'),
        isIncome: tx.type === 'income',
        isExpense: tx.type === 'expense'
      };
    });

    return {
      format: 'transactions',
      formatTitle: lang === 'ru' ? 'Журнал операций (CSV)' : 'Transactions Journal (CSV)',
      filename,
      filesize: filesize || text.length,
      accounts: stagedAccounts,
      transactions: stagedTransactions,
      payments: [],
      goals: [],
      purchases: [],
      categories: [],
      warnings,
      rawRowCount: stagedTransactions.length,
      previewRows
    };
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      readFile(e.dataTransfer.files[0]);
    }
  };

  // Read file from disk
  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = processRawInput(content, file.name, file.size);
        if (parsed) setParsedData(parsed);
      }
    };
    reader.onerror = () => {
      setErrorMsg(lang === 'ru' ? 'Ошибка при чтении файла' : 'Error reading file');
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Analyze pasted text
  const handleAnalyzePastedText = () => {
    if (!pastedText.trim()) {
      setErrorMsg(lang === 'ru' ? 'Пожалуйста, вставьте текст CSV или JSON' : 'Please paste CSV or JSON content');
      return;
    }
    const parsed = processRawInput(pastedText, 'pasted_data.csv', pastedText.length);
    if (parsed) setParsedData(parsed);
  };

  // Perform Import
  const handleExecuteImport = () => {
    if (!parsedData) return;
    setIsProcessing(true);

    try {
      const result = onImport({
        accounts: parsedData.accounts.length > 0 ? parsedData.accounts : undefined,
        transactions: parsedData.transactions.length > 0 ? parsedData.transactions : undefined,
        payments: parsedData.payments.length > 0 ? parsedData.payments : undefined,
        goals: parsedData.goals.length > 0 ? parsedData.goals : undefined,
        purchases: parsedData.purchases.length > 0 ? parsedData.purchases : undefined,
        categories: parsedData.categories.length > 0 ? parsedData.categories : undefined,
        salary: parsedData.salary,
        mode: importMode,
        skipBalanceUpdate
      });

      setIsProcessing(false);
      setImportSuccess(result);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMsg(lang === 'ru' ? `Ошибка импорта: ${err.message || err}` : `Import error: ${err.message || err}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 safe-area-overlay-compact bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#30363d] flex items-center justify-between shrink-0 bg-[#0d1117]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                {lang === 'ru' ? 'Импорт финансов' : 'Import Finances'}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  {lang === 'ru' ? '100% совместимо с экспортом' : '100% Export Compatible'}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                {lang === 'ru' 
                  ? 'Загрузка данных из экспортированных файлов CSV и JSON (Операции, Счета, Платежи, Цели, Полный отчёт)' 
                  : 'Load data from exported CSV and JSON files (Transactions, Accounts, Payments, Goals, Full Report)'}
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 bg-[#0d1117] compact-scrollbar">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SUCCESS SCREEN */}
          {importSuccess && (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-[#161b22] border border-emerald-500/30 rounded-2xl">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {lang === 'ru' ? 'Данные успешно импортированы!' : 'Data Imported Successfully!'}
              </h3>
              <p className="text-xs text-neutral-400 max-w-md mb-6">
                {lang === 'ru' 
                  ? 'Все записи были распознаны, проверены и сохранены в вашей финансовой базе данных.' 
                  : 'All records have been parsed, validated and saved into your financial database.'}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg mb-8">
                {importSuccess.transactions > 0 && (
                  <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col items-center">
                    <span className="text-xl font-bold text-emerald-400 font-mono">+{importSuccess.transactions}</span>
                    <span className="text-[11px] text-neutral-400">{lang === 'ru' ? 'Операций' : 'Transactions'}</span>
                  </div>
                )}
                {importSuccess.accounts > 0 && (
                  <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col items-center">
                    <span className="text-xl font-bold text-sky-400 font-mono">+{importSuccess.accounts}</span>
                    <span className="text-[11px] text-neutral-400">{lang === 'ru' ? 'Счетов' : 'Accounts'}</span>
                  </div>
                )}
                {importSuccess.payments > 0 && (
                  <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col items-center">
                    <span className="text-xl font-bold text-purple-400 font-mono">+{importSuccess.payments}</span>
                    <span className="text-[11px] text-neutral-400">{lang === 'ru' ? 'Платежей' : 'Payments'}</span>
                  </div>
                )}
                {importSuccess.goals > 0 && (
                  <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col items-center">
                    <span className="text-xl font-bold text-amber-400 font-mono">+{importSuccess.goals}</span>
                    <span className="text-[11px] text-neutral-400">{lang === 'ru' ? 'Целей' : 'Goals'}</span>
                  </div>
                )}
                {importSuccess.purchases > 0 && (
                  <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col items-center">
                    <span className="text-xl font-bold text-pink-400 font-mono">+{importSuccess.purchases}</span>
                    <span className="text-[11px] text-neutral-400">{lang === 'ru' ? 'Покупок' : 'Purchases'}</span>
                  </div>
                )}
                {importSuccess.categories > 0 && (
                  <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col items-center">
                    <span className="text-xl font-bold text-teal-400 font-mono">+{importSuccess.categories}</span>
                    <span className="text-[11px] text-neutral-400">{lang === 'ru' ? 'Категорий' : 'Categories'}</span>
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-emerald-500/20"
              >
                {lang === 'ru' ? 'Готово и вернуться к обзору' : 'Done & Return to Overview'}
              </button>
            </div>
          )}

          {/* STEP 1: FILE / TEXT INPUT IF NOT PARSED YET */}
          {!parsedData && !importSuccess && (
            <>
              {/* Tab Selector */}
              <div className="flex items-center gap-2 border-b border-[#30363d] pb-3">
                <button
                  onClick={() => setActiveTab('file')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'file' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{lang === 'ru' ? 'Загрузить файл .CSV / .JSON' : 'Upload .CSV / .JSON file'}</span>
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'text' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{lang === 'ru' ? 'Вставить текст из буфера' : 'Paste text from clipboard'}</span>
                </button>
              </div>

              {activeTab === 'file' ? (
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                    isDragging 
                      ? 'border-sky-400 bg-sky-500/10 scale-[0.99]' 
                      : 'border-[#30363d] hover:border-sky-500/50 hover:bg-[#161b22]/50 bg-[#161b22]'
                  }`}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".csv,.tsv,.txt,.json" 
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        readFile(e.target.files[0]);
                      }
                    }}
                    className="hidden" 
                  />
                  <div className="w-14 h-14 rounded-2xl bg-[#0d1117] border border-[#30363d] flex items-center justify-center text-sky-400 mb-4 shadow-md">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm sm:text-base font-semibold text-neutral-100 mb-1">
                    {lang === 'ru' ? 'Нажмите для выбора файла или перетащите его сюда' : 'Click to select file or drag and drop here'}
                  </h4>
                  <p className="text-xs text-neutral-400 text-center max-w-md mb-4">
                    {lang === 'ru'
                      ? 'Поддерживаются файлы CSV (разделители «;» и «,») и JSON, экспортированные из этого приложения или сформированные в Excel'
                      : 'Supports CSV files (semicolon and comma delimiters) and JSON exported from this app or created in Excel'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-neutral-400">
                    <span className="px-2 py-0.5 rounded-md bg-[#0d1117] border border-[#30363d]">.CSV</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#0d1117] border border-[#30363d]">.JSON</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#0d1117] border border-[#30363d]">.TSV</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#0d1117] border border-[#30363d]">.TXT</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <textarea
                    value={pastedText}
                    onChange={e => setPastedText(e.target.value)}
                    placeholder={lang === 'ru' 
                      ? 'Вставьте сюда содержимое файла CSV (таблицу) или JSON...' 
                      : 'Paste CSV spreadsheet rows or JSON text here...'}
                    className="w-full h-48 bg-[#161b22] border border-[#30363d] rounded-xl p-3 text-xs font-mono text-neutral-200 outline-none focus:border-sky-500/50 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleAnalyzePastedText}
                      disabled={!pastedText.trim()}
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>{lang === 'ru' ? 'Распознать данные' : 'Analyze Data'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Supported Export Formats Reference */}
              <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                  <Info className="w-4 h-4 text-sky-400" />
                  <span>{lang === 'ru' ? 'Поддерживаемые форматы экспорта (обратная совместимость):' : 'Supported Export Formats (Full Compatibility):'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-neutral-400">
                  <div className="p-2 bg-[#0d1117] rounded-lg border border-[#30363d]/70 flex items-center gap-2">
                    <Table className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{lang === 'ru' ? 'Операции (CSV)' : 'Transactions (CSV)'}</span>
                  </div>
                  <div className="p-2 bg-[#0d1117] rounded-lg border border-[#30363d]/70 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>{lang === 'ru' ? 'Счета и карты (CSV)' : 'Accounts & Cards (CSV)'}</span>
                  </div>
                  <div className="p-2 bg-[#0d1117] rounded-lg border border-[#30363d]/70 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>{lang === 'ru' ? 'Регулярные платежи (CSV)' : 'Recurring Payments (CSV)'}</span>
                  </div>
                  <div className="p-2 bg-[#0d1117] rounded-lg border border-[#30363d]/70 flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{lang === 'ru' ? 'Цели и покупки (CSV)' : 'Goals & Purchases (CSV)'}</span>
                  </div>
                  <div className="p-2 bg-[#0d1117] rounded-lg border border-[#30363d]/70 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-pink-400 shrink-0" />
                    <span>{lang === 'ru' ? 'Полный отчёт Vibe (CSV)' : 'Full Vibe Report (CSV)'}</span>
                  </div>
                  <div className="p-2 bg-[#0d1117] rounded-lg border border-[#30363d]/70 flex items-center gap-2">
                    <Database className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>{lang === 'ru' ? 'Полный бэкап (JSON)' : 'Full Backup (JSON)'}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* STEP 2: PREVIEW & IMPORT SETTINGS */}
          {parsedData && !importSuccess && (
            <div className="flex flex-col gap-4">
              {/* File details banner */}
              <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{parsedData.filename}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                        {parsedData.formatTitle}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {lang === 'ru' ? 'Обнаружено записей в файле:' : 'Total detected records in file:'} <span className="text-neutral-200 font-mono font-semibold">{parsedData.rawRowCount}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setParsedData(null)}
                  className="self-start md:self-auto text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] transition-colors"
                >
                  {lang === 'ru' ? '← Выбрать другой файл' : '← Choose another file'}
                </button>
              </div>

              {/* Entity Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {parsedData.transactions.length > 0 && (
                  <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-neutral-400">{lang === 'ru' ? 'Операций' : 'Transactions'}</p>
                      <p className="text-lg font-bold text-emerald-400 font-mono">{parsedData.transactions.length}</p>
                    </div>
                    <Table className="w-5 h-5 text-emerald-400/50" />
                  </div>
                )}
                {parsedData.accounts.length > 0 && (
                  <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-neutral-400">{lang === 'ru' ? 'Счетов' : 'Accounts'}</p>
                      <p className="text-lg font-bold text-sky-400 font-mono">{parsedData.accounts.length}</p>
                    </div>
                    <Wallet className="w-5 h-5 text-sky-400/50" />
                  </div>
                )}
                {parsedData.payments.length > 0 && (
                  <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-neutral-400">{lang === 'ru' ? 'Платежей' : 'Payments'}</p>
                      <p className="text-lg font-bold text-purple-400 font-mono">{parsedData.payments.length}</p>
                    </div>
                    <CalendarDays className="w-5 h-5 text-purple-400/50" />
                  </div>
                )}
                {(parsedData.goals.length > 0 || parsedData.purchases.length > 0) && (
                  <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-neutral-400">{lang === 'ru' ? 'Цели / Покупки' : 'Goals / Purchases'}</p>
                      <p className="text-lg font-bold text-amber-400 font-mono">{parsedData.goals.length + parsedData.purchases.length}</p>
                    </div>
                    <PiggyBank className="w-5 h-5 text-amber-400/50" />
                  </div>
                )}
              </div>

              {/* Import Options Configuration */}
              <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-2xl flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  {lang === 'ru' ? 'Настройки импорта' : 'Import Configuration'}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mode: Merge vs Replace */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-neutral-300 font-medium">
                      {lang === 'ru' ? 'Режим добавления данных:' : 'Data insertion mode:'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          importMode === 'merge'
                            ? 'bg-sky-500/10 border-sky-500/50 text-white'
                            : 'bg-[#0d1117] border-[#30363d] text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <p className="text-xs font-bold flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-sky-400" />
                          {lang === 'ru' ? 'Объединить (Merge)' : 'Merge / Append'}
                        </p>
                        <p className="text-[10px] text-neutral-400 mt-1">
                          {lang === 'ru' ? 'Добавит новые записи, сохранив текущие' : 'Add new items, keep current data'}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          importMode === 'replace'
                            ? 'bg-amber-500/10 border-amber-500/50 text-white'
                            : 'bg-[#0d1117] border-[#30363d] text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <p className="text-xs font-bold flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                          {lang === 'ru' ? 'Заменить (Replace)' : 'Replace'}
                        </p>
                        <p className="text-[10px] text-neutral-400 mt-1">
                          {lang === 'ru' ? 'Очистит раздел и запишет данные из файла' : 'Overwrite existing data with file'}
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Transaction Balance Handling */}
                  {parsedData.transactions.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-neutral-300 font-medium">
                        {lang === 'ru' ? 'Влияние на балансы счетов:' : 'Account balance impact:'}
                      </label>
                      <div className="flex flex-col gap-2">
                        <label 
                          onClick={() => setSkipBalanceUpdate(true)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                            skipBalanceUpdate 
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-neutral-200' 
                              : 'bg-[#0d1117] border-[#30363d] text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="balanceUpdate" 
                            checked={skipBalanceUpdate} 
                            onChange={() => setSkipBalanceUpdate(true)}
                            className="mt-0.5 accent-emerald-500" 
                          />
                          <div>
                            <p className="text-xs font-semibold text-neutral-200">
                              {lang === 'ru' ? 'Архивный импорт (не менять текущие балансы счетов)' : 'Archival import (do not modify account balances)'}
                            </p>
                            <p className="text-[10px] text-neutral-400 mt-0.5">
                              {lang === 'ru' ? 'Рекомендуется, если балансы на счетах уже актуальны' : 'Recommended if current balances are already accurate'}
                            </p>
                          </div>
                        </label>

                        <label 
                          onClick={() => setSkipBalanceUpdate(false)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                            !skipBalanceUpdate 
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-neutral-200' 
                              : 'bg-[#0d1117] border-[#30363d] text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="balanceUpdate" 
                            checked={!skipBalanceUpdate} 
                            onChange={() => setSkipBalanceUpdate(false)}
                            className="mt-0.5 accent-emerald-500" 
                          />
                          <div>
                            <p className="text-xs font-semibold text-neutral-200">
                              {lang === 'ru' ? 'Пересчитать балансы счетов по операциям' : 'Recalculate account balances based on operations'}
                            </p>
                            <p className="text-[10px] text-neutral-400 mt-0.5">
                              {lang === 'ru' ? 'Спишет расходы и зачислит доходы на соответствующие счета' : 'Debit expenses and credit incomes on target accounts'}
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    {lang === 'ru' ? 'Предпросмотр данных (первые строки)' : 'Data Preview (First Rows)'}
                  </h4>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {lang === 'ru' ? `Показано ${parsedData.previewRows.length} из ${parsedData.rawRowCount}` : `Showing ${parsedData.previewRows.length} of ${parsedData.rawRowCount}`}
                  </span>
                </div>

                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto compact-scrollbar max-h-60">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#0d1117] border-b border-[#30363d] text-neutral-400 text-[11px] font-mono">
                          <th className="py-2.5 px-3 font-medium">#</th>
                          <th className="py-2.5 px-3 font-medium">{lang === 'ru' ? 'Дата / Название' : 'Date / Name'}</th>
                          <th className="py-2.5 px-3 font-medium">{lang === 'ru' ? 'Тип / Банк' : 'Type / Bank'}</th>
                          <th className="py-2.5 px-3 font-medium">{lang === 'ru' ? 'Сумма' : 'Amount'}</th>
                          <th className="py-2.5 px-3 font-medium">{lang === 'ru' ? 'Категория / Свойства' : 'Category / Properties'}</th>
                          <th className="py-2.5 px-3 font-medium">{lang === 'ru' ? 'Счёт / Примечание' : 'Account / Note'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#30363d]/50 font-mono">
                        {parsedData.previewRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#30363d]/20 transition-colors">
                            <td className="py-2 px-3 text-neutral-500 text-[10px]">{idx + 1}</td>
                            <td className="py-2 px-3 text-neutral-200 font-sans font-medium whitespace-nowrap">{row.col1}</td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans ${
                                row.isIncome 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                  : row.isExpense 
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/30' 
                                    : 'bg-neutral-800 text-neutral-300'
                              }`}>
                                {row.col2}
                              </span>
                            </td>
                            <td className={`py-2 px-3 font-semibold whitespace-nowrap ${
                              row.isIncome ? 'text-emerald-400' : row.isExpense ? 'text-red-400' : 'text-neutral-200'
                            }`}>
                              {row.col3}
                            </td>
                            <td className="py-2 px-3 text-neutral-300 font-sans whitespace-nowrap">{row.col4}</td>
                            <td className="py-2 px-3 text-neutral-400 font-sans truncate max-w-[180px]">{row.col5}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="p-4 sm:p-5 border-t border-[#30363d] flex items-center justify-between shrink-0 bg-[#0d1117]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-transparent hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold transition-colors"
          >
            {lang === 'ru' ? 'Отмена' : 'Cancel'}
          </button>

          {parsedData && !importSuccess && (
            <button
              onClick={handleExecuteImport}
              disabled={isProcessing}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>
                {lang === 'ru' 
                  ? `Импортировать ${parsedData.rawRowCount} записей` 
                  : `Import ${parsedData.rawRowCount} records`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

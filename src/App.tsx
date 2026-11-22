import React, { useState, useMemo, FormEvent } from 'react';
import { useFinanceStore } from './hooks/useFinanceStore';
import { useSettingsStore } from './hooks/useSettingsStore';
import { useTranslation, TxKey } from './i18n';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Building2, Tag, ArrowUpCircle, ArrowDownCircle, Search, Trash2, Wallet, CalendarDays, TrendingUp, CheckCircle2, Circle, Calculator, PiggyBank, Pencil, Landmark, Banknote, Bitcoin, CreditCard, Briefcase, Percent, Handshake, Repeat, Target, Bell, Download, Upload, ShoppingBag, LayoutDashboard, X, ShieldCheck, Zap, ArrowUpRight, ArrowDownRight, Compass, Flame, SlidersHorizontal, Filter, ChevronDown, ChevronLeft, ChevronRight, Calendar, BarChart3, PieChart as PieChartIcon, Check, RefreshCw, ArrowUpDown, ArrowDownWideNarrow, ArrowUpNarrowWide, ArrowRight, Layers, Sparkles, Clock, LogOut } from 'lucide-react';
import { Account, Payment, Goal, AccountType, Recurrence } from './types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { NewTransactionForm as TransactionForm, CategoryForm, BankSelectorModal, FULL_BANKS, IconMap, CATEGORY_COLORS, getCategoryMeta } from './TransactionForms';
import { ExportModal } from './ExportModal';
import { ImportModal } from './ImportModal';
import { ResetDataModal } from './ResetDataModal';
import { AuthScreen } from './components/AuthScreen';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { formatMoney } from './utils';
import { FinancialTrends } from './FinancialTrends';
import { tokens } from './designTokens';
import { Card, CardHeader, Badge, MetricNumber, Button } from './components/ui/SharedComponents';

export { formatMoney };

function Modal({ children, onClose, title }: { children: React.ReactNode, onClose: () => void, title?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm" 
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e: any) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-[#30363d]/50 bg-[#0d1117]/50">
            <h3 className="font-medium text-neutral-200">{title}</h3>
            <button onClick={onClose} className="p-1 text-neutral-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto p-4 sm:p-5">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function TransactionManager({ transactions, categories, accounts, onAdd, onEdit, onRemove, onAddCategory, onAddPayment, onOpenReset, t, currency, lang }: any) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  
  // Filtering & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'this_month' | 'last_month' | 'this_year' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting state: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'category_asc'
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'category_asc'>('date_desc');

  // Transaction form state
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState<Recurrence>('monthly');
  const [skipBalanceUpdate, setSkipBalanceUpdate] = useState(false);

  // Category form state
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('ShoppingBag');
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');
  const [catParentId, setCatParentId] = useState('');
  const [catColor, setCatColor] = useState('orange');

  const startAdding = (initialType?: 'income' | 'expense') => {
    if (accounts.length === 0) {
      alert(lang === 'ru' ? 'Сначала добавьте хотя бы один счет' : 'Please add an account first');
      return;
    }
    const defaultType = initialType || (typeFilter === 'income' ? 'income' : 'expense');
    setEditingId('new');
    setAmount('');
    setType(defaultType);
    const availableCats = categories.filter((c: any) => c.type === defaultType);
    setCategoryId(availableCats[0]?.id || '');
    setAccountId(accounts[0].id);
    setDate(new Date().toISOString().split('T')[0]);
    setNote('');
    setIsRecurring(false);
    setRecurrence('monthly');
    setSkipBalanceUpdate(false);
  };

  const cancel = () => {
    setEditingId(null);
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!amount || !categoryId || !accountId || !date) return;
    
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) return;

    const data: any = {
      amount: numericAmount,
      type,
      categoryId,
      accountId,
      date,
      note,
      isRecurring,
      recurrence: isRecurring ? recurrence : 'none',
      skipBalanceUpdate: !!skipBalanceUpdate
    };

    if (editingId === 'new') {
      onAdd(data);
      // If user enabled recurring expense, also automatically add to planned regular payments
      if (isRecurring && recurrence && recurrence !== 'none' && onAddPayment) {
        const selectedCat = categories.find((c: any) => c.id === categoryId);
        const catTitle = selectedCat ? t(selectedCat.name) : '';
        const paymentName = catTitle ? (note ? `${catTitle} (${note})` : catTitle) : (note || (lang === 'ru' ? 'Регулярный расход' : 'Recurring expense'));
        onAddPayment({
          name: paymentName,
          amount: numericAmount,
          date: date,
          recurrence: recurrence,
          isActive: true,
          accountId: accountId,
          isFlexible: false
        });
      }
    } else if (editingId) {
      if (onEdit) {
        onEdit(editingId, data);
      } else {
        onRemove(editingId);
        onAdd(data);
      }
    }
    setEditingId(null);
  };

  const handleAddCategorySubmit = (e: any) => {
    e.preventDefault();
    if (!catName.trim() || !catIcon) return;
    const newCat = {
      name: catName.trim(),
      icon: catIcon,
      type: catType,
      color: catColor || 'neutral',
      parentId: catParentId || undefined,
      isParent: !catParentId && catType === 'expense'
    };
    onAddCategory(newCat);
    setIsAddingCategory(false);
    setCatName('');
    setCatParentId('');
  };

  // Date filtering helpers
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Start of current week (Monday)
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diffToMon = (day === 0 ? -6 : 1) - day;
  startOfWeek.setDate(startOfWeek.getDate() + diffToMon);
  startOfWeek.setHours(0, 0, 0, 0);

  // Apply all filters
  const filteredTransactions = transactions.filter((tx: any) => {
    // Type filter
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

    // Category filter (Matches either specific subcategory OR parent category and its children)
    if (categoryFilter !== 'all') {
      const isMatch = tx.categoryId === categoryFilter || categories.some((c: any) => c.id === tx.categoryId && c.parentId === categoryFilter);
      if (!isMatch) return false;
    }

    // Account filter
    if (accountFilter !== 'all' && tx.accountId !== accountFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const meta = getCategoryMeta(categories, tx.categoryId, t);
      const catName = meta.name.toLowerCase();
      const parentName = meta.parentName.toLowerCase();
      const acc = accounts.find((a: any) => a.id === tx.accountId);
      const accName = acc ? acc.name.toLowerCase() : '';
      const noteMatch = (tx.note || '').toLowerCase().includes(q);
      const amountMatch = tx.amount.toString().includes(q);
      if (!catName.includes(q) && !parentName.includes(q) && !accName.includes(q) && !noteMatch && !amountMatch) {
        return false;
      }
    }

    // Period filter
    const txDate = new Date(tx.date + 'T00:00:00');
    const txDateStr = tx.date;

    if (periodFilter === 'today') {
      return txDateStr === todayStr;
    } else if (periodFilter === 'yesterday') {
      return txDateStr === yesterdayStr;
    } else if (periodFilter === 'week') {
      return txDate >= startOfWeek;
    } else if (periodFilter === 'this_month') {
      return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
    } else if (periodFilter === 'last_month') {
      const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
      const lastMonthYear = lastMonthDate.getFullYear();
      const lastMonthNum = lastMonthDate.getMonth();
      return txDate.getFullYear() === lastMonthYear && txDate.getMonth() === lastMonthNum;
    } else if (periodFilter === 'this_year') {
      return txDate.getFullYear() === currentYear;
    } else if (periodFilter === 'custom') {
      if (customStartDate && txDateStr < customStartDate) return false;
      if (customEndDate && txDateStr > customEndDate) return false;
      return true;
    }

    // Amount range filter
    if (minAmount.trim() !== '') {
      const min = parseFloat(minAmount);
      if (!isNaN(min) && tx.amount < min) return false;
    }
    if (maxAmount.trim() !== '') {
      const max = parseFloat(maxAmount);
      if (!isNaN(max) && tx.amount > max) return false;
    }

    return true;
  });

  // Sorting logic based on selected sortBy criteria
  const sortedTransactions = [...filteredTransactions].sort((a: any, b: any) => {
    if (sortBy === 'amount_desc') {
      // Highest amount first (largest expenses / incomes at top)
      const diff = (b.amount || 0) - (a.amount || 0);
      if (diff !== 0) return diff;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (sortBy === 'amount_asc') {
      // Lowest amount first (smallest expenses / incomes at top)
      const diff = (a.amount || 0) - (b.amount || 0);
      if (diff !== 0) return diff;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (sortBy === 'date_asc') {
      // Oldest date first
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (diff !== 0) return diff;
      return (b.amount || 0) - (a.amount || 0);
    }
    if (sortBy === 'category_asc') {
      // Alphabetical by category name
      const metaA = getCategoryMeta(categories, a.categoryId, t).name || '';
      const metaB = getCategoryMeta(categories, b.categoryId, t).name || '';
      const cmp = metaA.localeCompare(metaB);
      if (cmp !== 0) return cmp;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    // Default: 'date_desc' (newest transactions first)
    const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (diff !== 0) return diff;
    return (b.amount || 0) - (a.amount || 0);
  });

  // Aggregate stats for filtered list
  const totalFilteredIncome = filteredTransactions
    .filter((tx: any) => tx.type === 'income')
    .reduce((sum: number, tx: any) => sum + tx.amount, 0);

  const totalFilteredExpense = filteredTransactions
    .filter((tx: any) => tx.type === 'expense')
    .reduce((sum: number, tx: any) => sum + tx.amount, 0);

  const filteredNet = totalFilteredIncome - totalFilteredExpense;

  // Active filters list for chips and badge
  const activeFiltersList = useMemo(() => {
    const list: { id: string; label: string; onRemove: () => void }[] = [];
    if (typeFilter !== 'all') {
      list.push({
        id: 'type',
        label: typeFilter === 'income' ? (t('income') || (lang === 'ru' ? 'Доходы' : 'Income')) : (t('expenses') || (lang === 'ru' ? 'Расходы' : 'Expenses')),
        onRemove: () => setTypeFilter('all')
      });
    }
    if (categoryFilter !== 'all') {
      const cat = categories.find((c: any) => c.id === categoryFilter);
      list.push({
        id: 'category',
        label: cat ? t(cat.name) : (lang === 'ru' ? 'Категория' : 'Category'),
        onRemove: () => setCategoryFilter('all')
      });
    }
    if (accountFilter !== 'all') {
      const acc = accounts.find((a: any) => a.id === accountFilter);
      list.push({
        id: 'account',
        label: acc ? acc.name : (lang === 'ru' ? 'Счёт' : 'Account'),
        onRemove: () => setAccountFilter('all')
      });
    }
    if (minAmount.trim() !== '' || maxAmount.trim() !== '') {
      let amountLabel = '';
      if (minAmount.trim() !== '' && maxAmount.trim() !== '') {
        amountLabel = `${minAmount} — ${maxAmount} ${currency}`;
      } else if (minAmount.trim() !== '') {
        amountLabel = `≥ ${minAmount} ${currency}`;
      } else {
        amountLabel = `≤ ${maxAmount} ${currency}`;
      }
      list.push({
        id: 'amount',
        label: amountLabel,
        onRemove: () => { setMinAmount(''); setMaxAmount(''); }
      });
    }
    if (periodFilter !== 'all') {
      const periodLabels: Record<string, string> = {
        today: lang === 'ru' ? 'Сегодня' : 'Today',
        yesterday: lang === 'ru' ? 'Вчера' : 'Yesterday',
        week: lang === 'ru' ? 'Эта неделя' : 'This Week',
        this_month: lang === 'ru' ? 'Этот месяц' : 'This Month',
        last_month: lang === 'ru' ? 'Прошлый месяц' : 'Last Month',
        this_year: lang === 'ru' ? 'Этот год' : 'This Year',
        custom: lang === 'ru' ? 'Период' : 'Custom period'
      };
      list.push({
        id: 'period',
        label: periodLabels[periodFilter] || periodFilter,
        onRemove: () => { setPeriodFilter('all'); setCustomStartDate(''); setCustomEndDate(''); }
      });
    }
    if (searchQuery.trim() !== '') {
      list.push({
        id: 'search',
        label: `"${searchQuery.trim()}"`,
        onRemove: () => setSearchQuery('')
      });
    }
    return list;
  }, [typeFilter, categoryFilter, accountFilter, minAmount, maxAmount, periodFilter, searchQuery, categories, accounts, lang, currency, t]);

  const hasActiveFilters = activeFiltersList.length > 0;

  const resetFilters = () => {
    setTypeFilter('all');
    setCategoryFilter('all');
    setAccountFilter('all');
    setPeriodFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSearchQuery('');
    setMinAmount('');
    setMaxAmount('');
  };

  // Group sorted transactions by day with localized headers & totals
  const groupedTransactions = useMemo(() => {
    const groups: { dateKey: string; dateTitle: string; transactions: any[]; totalIncome: number; totalExpense: number }[] = [];
    const map: Record<string, { dateKey: string; dateTitle: string; transactions: any[]; totalIncome: number; totalExpense: number }> = {};

    sortedTransactions.forEach(tx => {
      const dateKey = tx.date;
      if (!map[dateKey]) {
        const d = new Date(dateKey + 'T00:00:00');
        let title = '';
        if (dateKey === todayStr) {
          title = lang === 'ru' ? 'Сегодня' : 'Today';
        } else if (dateKey === yesterdayStr) {
          title = lang === 'ru' ? 'Вчера' : 'Yesterday';
        } else {
          if (lang === 'ru') {
            title = d.toLocaleDateString('ru-RU', { 
              day: 'numeric', 
              month: 'long', 
              year: d.getFullYear() !== currentYear ? 'numeric' : undefined 
            });
          } else {
            title = d.toLocaleDateString('en-US', { 
              day: 'numeric', 
              month: 'short', 
              year: d.getFullYear() !== currentYear ? 'numeric' : undefined 
            });
          }
        }

        map[dateKey] = {
          dateKey,
          dateTitle: title,
          transactions: [],
          totalIncome: 0,
          totalExpense: 0
        };
        groups.push(map[dateKey]);
      }

      map[dateKey].transactions.push(tx);
      if (tx.type === 'income') {
        map[dateKey].totalIncome += tx.amount;
      } else {
        map[dateKey].totalExpense += tx.amount;
      }
    });

    return groups;
  }, [sortedTransactions, todayStr, yesterdayStr, lang, currentYear]);

  return (
    <section className="flex flex-col bg-[#161b22] border border-[#30363d] rounded-2xl p-3 sm:p-5 gap-4 shrink-0 shadow-lg">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#30363d]/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0d1117] rounded-xl text-emerald-400 border border-[#30363d]">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">{t('transactions_title') || (lang === 'ru' ? 'Операции' : 'Transactions')}</h2>
              <span className="px-2 py-0.5 rounded-full text-xs bg-[#0d1117] text-neutral-400 border border-[#30363d] font-mono">
                {filteredTransactions.length}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {lang === 'ru' ? 'Удобная фильтрация по периодам, категориям, счетам и типам' : 'Filter by period, category, account and type'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {transactions.length > 0 && onOpenReset && (
            <button 
              onClick={onOpenReset}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-medium border border-[#30363d] bg-[#0d1117] text-neutral-400 hover:text-neutral-200 hover:border-neutral-500 flex items-center gap-1.5 transition-all"
              title={lang === 'ru' ? 'Сброс счетов и операций' : 'Reset accounts and transactions'}
            >
              <Trash2 className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden sm:inline text-[11px]">{lang === 'ru' ? 'Сброс' : 'Reset'}</span>
            </button>
          )}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${showFilters || hasActiveFilters ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm' : 'bg-[#0d1117] border-[#30363d] text-neutral-300 hover:text-white'}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{lang === 'ru' ? 'Фильтры' : 'Filters'}</span>
            {activeFiltersList.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-black text-[10px] font-bold flex items-center justify-center shrink-0">
                {activeFiltersList.length}
              </span>
            )}
          </button>
          
          <button 
            onClick={() => startAdding()}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> {t('add_transaction') || (lang === 'ru' ? 'Добавить операцию' : 'Add Transaction')}
          </button>
        </div>
      </div>

      {/* Summary KPI Strip: Compact 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
        <div className="px-3 py-2 bg-[#0d1117] border border-[#30363d]/70 rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs text-neutral-400 truncate">{t('total_inflow') || (lang === 'ru' ? 'Доходы' : 'Income')}</span>
          </div>
          <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono tracking-tight tabular-nums shrink-0">
            +{formatMoney(totalFilteredIncome, currency, lang)}
          </span>
        </div>

        <div className="px-3 py-2 bg-[#0d1117] border border-[#30363d]/70 rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1 rounded-md bg-rose-500/10 text-rose-400 shrink-0">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs text-neutral-400 truncate">{t('total_outflow') || (lang === 'ru' ? 'Расходы' : 'Expense')}</span>
          </div>
          <span className="text-sm sm:text-base font-bold text-neutral-100 font-mono tracking-tight tabular-nums shrink-0">
            -{formatMoney(totalFilteredExpense, currency, lang)}
          </span>
        </div>

        <div className="px-3 py-2 bg-[#0d1117] border border-[#30363d]/70 rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1 rounded-md bg-blue-500/10 text-blue-400 shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs text-neutral-400 truncate">{t('net_period_flow') || (lang === 'ru' ? 'Сальдо' : 'Net Flow')}</span>
          </div>
          <span className={`text-sm sm:text-base font-bold font-mono tracking-tight tabular-nums shrink-0 ${filteredNet >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {filteredNet >= 0 ? '+' : ''}{formatMoney(filteredNet, currency, lang)}
          </span>
        </div>
      </div>

      {/* Main Interactive Filter Bar */}
      <div className="flex flex-col gap-2.5">
        {/* Search and Quick Type Pills */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder={t('filter_search_placeholder') || (lang === 'ru' ? 'Поиск по комментарию, категории, счету, сумме...' : 'Search by note, category, account or amount...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Type Selector */}
          <div className="flex items-center p-1 bg-[#0d1117] border border-[#30363d] rounded-xl shrink-0">
            <button 
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${typeFilter === 'all' ? 'bg-[#161b22] text-white border border-[#30363d]' : 'text-neutral-400 hover:text-white'}`}
            >
              {t('filter_all') || (lang === 'ru' ? 'Все' : 'All')}
            </button>
            <button 
              onClick={() => setTypeFilter('income')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${typeFilter === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-neutral-400 hover:text-emerald-300'}`}
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>{t('income') || (lang === 'ru' ? 'Доходы' : 'Income')}</span>
            </button>
            <button 
              onClick={() => setTypeFilter('expense')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${typeFilter === 'expense' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'text-neutral-400 hover:text-red-300'}`}
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span>{t('expenses') || (lang === 'ru' ? 'Расходы' : 'Expenses')}</span>
            </button>
          </div>
        </div>

        {/* Quick Period Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto compact-scrollbar pb-1 text-xs">
          {[
            { id: 'all', label: t('filter_all_time') || (lang === 'ru' ? 'За все время' : 'All Time') },
            { id: 'today', label: t('filter_today') || (lang === 'ru' ? 'Сегодня' : 'Today') },
            { id: 'yesterday', label: t('filter_yesterday') || (lang === 'ru' ? 'Вчера' : 'Yesterday') },
            { id: 'week', label: t('filter_this_week') || (lang === 'ru' ? 'Эта неделя' : 'This Week') },
            { id: 'this_month', label: t('filter_this_month') || (lang === 'ru' ? 'Этот месяц' : 'This Month') },
            { id: 'last_month', label: t('filter_last_month') || (lang === 'ru' ? 'Прошлый месяц' : 'Last Month') },
            { id: 'this_year', label: t('filter_this_year') || (lang === 'ru' ? 'Этот год' : 'This Year') },
            { id: 'custom', label: t('filter_custom_date') || (lang === 'ru' ? 'Выбрать дату' : 'Custom Date') }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodFilter(p.id as any)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${periodFilter === p.id ? 'bg-neutral-200 text-black shadow-sm font-semibold' : 'bg-[#0d1117] text-neutral-400 hover:text-neutral-200 border border-[#30363d]/60'}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Extended Filter Panel (Account, Category, Amount Range, Custom Date) */}
        <AnimatePresence>
          {(showFilters || periodFilter === 'custom') && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 sm:p-4 bg-[#0d1117] rounded-xl border border-[#30363d] overflow-hidden flex flex-col gap-3 shadow-md"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Account Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-400 font-medium">{t('account') || (lang === 'ru' ? 'Счёт' : 'Account')}</label>
                  <select 
                    value={accountFilter} 
                    onChange={(e) => setAccountFilter(e.target.value)}
                    className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                  >
                    <option value="all">{lang === 'ru' ? 'Все счета' : 'All Accounts'}</option>
                    {accounts.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-400 font-medium">{t('filter_category') || (lang === 'ru' ? 'Категория' : 'Category')}</label>
                  <select 
                    value={categoryFilter} 
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500 font-sans"
                  >
                    <option value="all">{lang === 'ru' ? 'Все категории' : 'All Categories'}</option>
                    
                    {/* Incomes */}
                    <optgroup label={lang === 'ru' ? '— Доходы —' : '— Incomes —'}>
                      {categories.filter((c: any) => c.type === 'income').map((c: any) => (
                        <option key={c.id} value={c.id}>
                          🟢 {t(c.name)}
                        </option>
                      ))}
                    </optgroup>

                    {/* Expenses Hierarchical Groups */}
                    <optgroup label={lang === 'ru' ? '— Расходы —' : '— Expenses —'}>
                      {categories.filter((c: any) => c.type === 'expense' && !c.parentId).map((parent: any) => {
                        const subs = categories.filter((c: any) => c.parentId === parent.id);
                        return (
                          <React.Fragment key={parent.id}>
                            <option value={parent.id} className="font-semibold text-white">
                              📁 {t(parent.name)} ({lang === 'ru' ? 'вся группа' : 'all group'})
                            </option>
                            {subs.map((sub: any) => (
                              <option key={sub.id} value={sub.id}>
                                &nbsp;&nbsp;&nbsp;↳ {t(sub.name)}
                              </option>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </optgroup>
                  </select>
                </div>

                {/* Amount Range Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-400 font-medium">
                    {lang === 'ru' ? 'Диапазон суммы' : 'Amount Range'} ({currency})
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input 
                      type="number" 
                      placeholder={lang === 'ru' ? 'От ₽' : 'Min'}
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-emerald-500 font-mono"
                    />
                    <input 
                      type="number" 
                      placeholder={lang === 'ru' ? 'До ₽' : 'Max'}
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Date Range if selected or general reset */}
              {periodFilter === 'custom' && (
                <div className="pt-2 border-t border-[#30363d]/50 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <span className="text-xs text-neutral-400 font-medium">
                    {lang === 'ru' ? 'Точные даты:' : 'Exact dates:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={customStartDate} 
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-[#161b22] border border-[#30363d] rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-emerald-500"
                    />
                    <span className="text-neutral-500 text-xs">—</span>
                    <input 
                      type="date" 
                      value={customEndDate} 
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-[#161b22] border border-[#30363d] rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Filters Chips */}
        {activeFiltersList.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-xs text-neutral-400 font-medium mr-1">
              {lang === 'ru' ? 'Активные фильтры:' : 'Active filters:'}
            </span>
            {activeFiltersList.map(item => (
              <span 
                key={item.id} 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-[#0d1117] border border-emerald-500/30 text-neutral-200"
              >
                <span>{item.label}</span>
                <button 
                  onClick={item.onRemove}
                  className="text-neutral-400 hover:text-rose-400 transition-colors p-0.5"
                  title={lang === 'ru' ? 'Удалить фильтр' : 'Remove filter'}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button 
              onClick={resetFilters}
              className="text-xs text-rose-400 hover:text-rose-300 underline font-medium ml-1"
            >
              {lang === 'ru' ? 'Очистить все' : 'Clear all'}
            </button>
          </div>
        )}
      </div>

      {/* Transaction Modal/Form */}
      <AnimatePresence>
        {editingId !== null && !isAddingCategory && (
          <TransactionForm 
            key="form"
            isNew={editingId === 'new'}
            amount={amount} setAmount={setAmount}
            type={type} setType={setType}
            categoryId={categoryId} setCategoryId={setCategoryId}
            accountId={accountId} setAccountId={setAccountId}
            date={date} setDate={setDate}
            note={note} setNote={setNote}
            isRecurring={isRecurring} setIsRecurring={setIsRecurring}
            recurrence={recurrence} setRecurrence={setRecurrence}
            skipBalanceUpdate={skipBalanceUpdate} setSkipBalanceUpdate={setSkipBalanceUpdate}
            categories={categories}
            accounts={accounts}
            transactions={transactions}
            cancel={cancel} 
            handleSubmit={handleSubmit} 
            onRemove={() => { if (editingId !== 'new') onRemove(editingId); cancel(); }} 
            t={t}
            currency={currency}
            lang={lang}
            onAddCategory={(presetParentId?: string | null) => {
              setCatType(type);
              setCatParentId(presetParentId || '');
              setIsAddingCategory(true);
            }}
          />
        )}
        {isAddingCategory && (
          <CategoryForm 
            key="catForm"
            type={catType}
            setType={setCatType}
            name={catName} setName={setCatName}
            icon={catIcon} setIcon={setCatIcon}
            parentId={catParentId} setParentId={setCatParentId}
            color={catColor} setColor={setCatColor}
            categories={categories}
            cancel={() => { setIsAddingCategory(false); setCatParentId(''); }}
            handleSubmit={handleAddCategorySubmit}
            t={t}
            lang={lang}
          />
        )}
      </AnimatePresence>

      {/* Transaction Sorting & Count Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 pb-1 border-t border-[#30363d]/40">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span>{lang === 'ru' ? 'Отображено операций:' : 'Displayed transactions:'}</span>
          <span className="font-semibold text-white font-mono bg-[#0d1117] px-2 py-0.5 rounded-md border border-[#30363d]">
            {sortedTransactions.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-neutral-400 text-xs mr-0.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-medium">{t('sort_by') || (lang === 'ru' ? 'Сортировка:' : 'Sort:')}</span>
          </div>

          <div className="flex items-center gap-1">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#0d1117] border border-[#30363d] hover:border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-medium outline-none cursor-pointer transition-colors focus:border-emerald-500"
            >
              <option value="date_desc">📅 {t('sort_date_desc') || (lang === 'ru' ? 'По дате: сначала новые' : 'Date: Newest first')}</option>
              <option value="amount_desc">💰 {t('sort_amount_desc') || (lang === 'ru' ? 'По сумме: от большего к меньшему' : 'Amount: High to low')}</option>
              <option value="amount_asc">🪙 {t('sort_amount_asc') || (lang === 'ru' ? 'По сумме: от меньшего к большему' : 'Amount: Low to high')}</option>
              <option value="date_asc">⏳ {t('sort_date_asc') || (lang === 'ru' ? 'По дате: сначала старые' : 'Date: Oldest first')}</option>
              <option value="category_asc">🔤 {t('sort_category_asc') || (lang === 'ru' ? 'По категории (А—Я)' : 'Category: A to Z')}</option>
            </select>

            {/* Quick Toggle Button for Amount vs Date */}
            <button
              type="button"
              onClick={() => {
                if (sortBy === 'date_desc') setSortBy('amount_desc');
                else if (sortBy === 'amount_desc') setSortBy('amount_asc');
                else if (sortBy === 'amount_asc') setSortBy('date_desc');
                else setSortBy('date_desc');
              }}
              title={lang === 'ru' ? 'Быстрое переключение сортировки' : 'Quick toggle sort'}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
                sortBy === 'amount_desc' || sortBy === 'amount_asc'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-[#0d1117] text-neutral-400 hover:text-white border-[#30363d]'
              }`}
            >
              {sortBy === 'amount_desc' ? (
                <ArrowDownWideNarrow className="w-3.5 h-3.5" />
              ) : sortBy === 'amount_asc' ? (
                <ArrowUpNarrowWide className="w-3.5 h-3.5" />
              ) : (
                <ArrowUpDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Transactions List Grouped by Days */}
      <div className="flex flex-col overflow-y-auto compact-scrollbar pr-1 max-h-[600px]">
        {sortedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#0d1117] border border-[#30363d] flex items-center justify-center text-neutral-500 mb-3">
              <Search className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-neutral-300">
              {hasActiveFilters 
                ? (lang === 'ru' ? 'Операции не найдены по выбранным фильтрам' : 'No transactions match the selected filters') 
                : (t('no_transactions') || (lang === 'ru' ? 'Операций пока нет' : 'No transactions yet'))}
            </p>
            {hasActiveFilters ? (
              <button 
                onClick={resetFilters}
                className="mt-3 px-3 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] text-emerald-400 rounded-lg hover:border-emerald-500 transition-colors"
              >
                {t('filter_clear') || (lang === 'ru' ? 'Сбросить все фильтры' : 'Reset all filters')}
              </button>
            ) : (
              <button 
                onClick={() => startAdding()}
                className="mt-3 px-3.5 py-1.5 text-xs bg-emerald-500 font-semibold text-black rounded-lg hover:bg-emerald-400 transition-colors"
              >
                {lang === 'ru' ? 'Добавить первую операцию' : 'Add First Transaction'}
              </button>
            )}
          </div>
        ) : (
          groupedTransactions.map((group) => (
            <div key={group.dateKey} className="flex flex-col mb-2 last:mb-0">
              {/* Day Header with Localized Title and Daily Totals */}
              <div className="sticky top-0 z-10 bg-[#161b22]/95 backdrop-blur-sm py-1.5 px-2.5 border-b border-[#30363d]/50 flex items-center justify-between text-xs font-medium">
                <span className="font-semibold text-neutral-200">
                  {group.dateTitle}
                </span>
                <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                  {group.totalIncome > 0 && (
                    <span className="text-emerald-400 font-medium">
                      +{formatMoney(group.totalIncome, currency, lang)}
                    </span>
                  )}
                  {group.totalExpense > 0 && (
                    <span className="text-neutral-400 font-medium">
                      -{formatMoney(group.totalExpense, currency, lang)}
                    </span>
                  )}
                  {group.totalIncome === 0 && group.totalExpense === 0 && (
                    <span className="text-neutral-500 font-medium">0 {currency}</span>
                  )}
                </div>
              </div>

              {/* Transactions for this Day */}
              <div className="flex flex-col divide-y divide-[#30363d]/25">
                {group.transactions.map((tx: any) => {
                  const catMeta = getCategoryMeta(categories, tx.categoryId, t);
                  const acc = accounts.find((a: any) => a.id === tx.accountId);
                  const isIncome = tx.type === 'income';
                  const hasRecurrence = tx.isRecurring || (tx.recurrence && tx.recurrence !== 'none');
                  
                  // Icon handling
                  const IconComp = IconMap[catMeta.icon] || (isIncome ? ArrowUpCircle : ShoppingBag);
                  const colorClass = CATEGORY_COLORS[catMeta.color || 'neutral'] || CATEGORY_COLORS['neutral'];

                  return (
                    <div 
                      key={tx.id} 
                      onClick={() => {
                        setEditingId(tx.id);
                        setAmount(tx.amount.toString());
                        setType(tx.type);
                        setCategoryId(tx.categoryId);
                        setAccountId(tx.accountId);
                        setDate(tx.date);
                        setNote(tx.note || '');
                        setIsRecurring(!!tx.isRecurring || (!!tx.recurrence && tx.recurrence !== 'none'));
                        setRecurrence(tx.recurrence || 'monthly');
                        setSkipBalanceUpdate(!!tx.skipBalanceUpdate);
                      }}
                      className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[#30363d]/25 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center shrink-0 bg-[#0d1117] ${isIncome ? 'border-emerald-500/30 text-emerald-400' : 'border-neutral-700 text-neutral-300'} ${colorClass}`}>
                          <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-medium text-xs sm:text-sm text-neutral-100 leading-tight group-hover:text-emerald-400 transition-colors truncate">
                              {catMeta.name}
                            </h4>
                            {catMeta.parentName && (
                              <span className="text-[11px] text-neutral-400 font-normal">
                                ({catMeta.parentName})
                              </span>
                            )}
                            {tx.skipBalanceUpdate && (
                              <span 
                                title={lang === 'ru' ? 'Без списания со счёта' : 'No balance deduction'}
                                className="inline-flex items-center text-amber-400/90 hover:text-amber-300 transition-colors cursor-help shrink-0"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {hasRecurrence && (
                              <span 
                                title={tx.recurrence === 'weekly' ? (lang === 'ru' ? 'Повтор каждую неделю' : 'Repeats weekly') : tx.recurrence === 'yearly' ? (lang === 'ru' ? 'Повтор каждый год' : 'Repeats yearly') : (lang === 'ru' ? 'Повтор каждый месяц' : 'Repeats monthly')}
                                className="inline-flex items-center text-emerald-400/80 hover:text-emerald-300 transition-colors cursor-help shrink-0"
                              >
                                <Repeat className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-400 flex items-center gap-1.5 truncate mt-0.5">
                            {acc && <span className="text-neutral-400 truncate max-w-[130px] sm:max-w-[180px]">{acc.name}</span>}
                            {acc && tx.note && <span className="text-neutral-600">•</span>}
                            {tx.note && <span className="text-neutral-300 italic truncate max-w-[160px] sm:max-w-[320px]">«{tx.note}»</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className={`font-semibold text-xs sm:text-sm font-mono tracking-tight tabular-nums ${isIncome ? 'text-emerald-400' : 'text-neutral-200'}`}>
                          {isIncome ? '+' : '-'}{formatMoney(tx.amount, currency, lang)}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-neutral-400 hover:text-white hidden sm:block">
                          <Pencil className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'purchases' | 'payments' | 'transactions'>('dashboard');
  const { session, isLoading: isAuthLoading, error: authError, setError: setAuthError, signOut } = useSupabaseAuth();
  const [isGuest, setIsGuest] = useState(false);
  const { language, setLanguage, currency, setCurrency } = useSettingsStore();
  const {
    salary, setSalary,
    accounts, addAccount, editAccount, removeAccount,
    payments, addPayment, editPayment, removePayment, togglePaymentActive,
    goals, addGoal, editGoal, removeGoal,
    purchases, addPurchase, editPurchase, removePurchase,
    transactions, addTransaction, editTransaction, removeTransaction,
    categories, addCategory,
    importFinanceData,
    resetFinanceData,
    syncStatus,
    syncError,
    isForeignLocalData,
    retrySync
  } = useFinanceStore(isGuest ? null : session?.user.id || null);

  const t = useTranslation(language);

  const handleAccountAction = async () => {
    if (!session) {
      setIsGuest(false);
      return;
    }

    try {
      await signOut();
      setIsGuest(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : String(error));
    }
  };

  // Capital: Strictly real money currently available (checking, savings, deposit, cash, crypto).
  // Credits, credit cards and loans are completely excluded from capital.
  const ownFunds = accounts
    .filter(a => a.type !== 'debt' && a.type !== 'credit')
    .reduce((sum, acc) => sum + (acc.balance > 0 ? acc.balance : 0), 0);

  const totalCreditDebt = accounts
    .filter(a => a.type === 'credit')
    .reduce((sum, a) => {
      const limit = a.creditLimit !== undefined && a.creditLimit !== null && a.creditLimit > 0 ? a.creditLimit : a.balance;
      const debtFromLimit = Math.max(0, limit - a.balance);
      const negDebt = a.balance < 0 ? Math.abs(a.balance) : 0;
      return sum + Math.max(debtFromLimit, negDebt);
    }, 0);

  const totalDebts = accounts
    .filter(a => a.type === 'debt')
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

  const totalDebtsAndCredit = totalCreditDebt + totalDebts;
  // Capital strictly reflects real money available at the current moment
  const grossAssets = ownFunds;
  const netWorth = ownFunds;
  const totalBalance = ownFunds;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const next30Days = new Date(today);
  next30Days.setDate(next30Days.getDate() + 30);

  const displayPayments = payments.filter(p => {
    if (p.isFlexible) return true;
    const d = new Date(p.date + 'T00:00:00');
    d.setHours(0,0,0,0);
    if (!p.recurrence || p.recurrence === 'none') {
      return d >= today;
    }
    return true;
  });

  const totalObligations = displayPayments.reduce((sum, p) => {
    if (!p.isActive) return sum;
    
    if (p.isFlexible) {
      return sum + p.amount;
    }
    
    if (p.recurrence === 'yearly') {
      return sum + (p.amount / 12);
    } else if (p.recurrence === 'monthly') {
      return sum + p.amount;
    } else if (p.recurrence === 'weekly') {
      return sum + (p.amount * 52 / 12);
    } else {
      const d = new Date(p.date + 'T00:00:00');
      d.setHours(0, 0, 0, 0);
      if (d >= today && d <= next30Days) {
        return sum + p.amount;
      }
      return sum;
    }
  }, 0);
  
  const monthlyInterest = accounts.reduce((sum, acc) => {
    if (!acc.interestRate) return sum;
    return sum + (acc.balance * (acc.interestRate / 100) / 12);
  }, 0);

  const totalIncome = salary + monthlyInterest;
  const freeCashFlow = totalIncome - totalObligations;

  const totalPurchases = purchases?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const capitalAfterPurchases = netWorth - totalPurchases;

  const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const remainingDaysInMonth = Math.max(1, daysInCurrentMonth - today.getDate());
  const dailySafeSpend = Math.max(0, Math.round(freeCashFlow / remainingDaysInMonth));

  const [isCapitalDetailOpen, setIsCapitalDetailOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [exportInitialTable, setExportInitialTable] = useState<'transactions' | 'accounts' | 'payments' | 'goals_purchases' | 'full_report' | 'json_backup'>('transactions');

  const handleConfirmReset = (options: any) => {
    resetFinanceData(options);
    const msg = language === 'ru'
      ? 'Выбранные финансовые данные успешно сброшены'
      : 'Selected financial data has been reset';
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const openExportModal = (table: 'transactions' | 'accounts' | 'payments' | 'goals_purchases' | 'full_report' | 'json_backup' = 'transactions') => {
    setExportInitialTable(table);
    setIsExportOpen(true);
  };

  if (session && isForeignLocalData) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0d1117] px-4 py-8 text-neutral-200">
        <section className="w-full max-w-md rounded-2xl border border-[#30363d] bg-[#161b22] p-6 text-center shadow-2xl">
          <h1 className="text-xl font-semibold text-white">Vibe Finance</h1>
          <p className="mt-3 text-sm text-neutral-400">
            {syncStatus === 'error'
              ? (language === 'ru'
                ? 'Не удалось загрузить данные этого аккаунта. Локальные данные другого аккаунта скрыты.'
                : 'Could not load this account. Local data from another account is hidden.')
              : (language === 'ru'
                ? 'Загружаем данные этого аккаунта…'
                : 'Loading this account’s data…')}
          </p>
          {syncStatus === 'error' && (
            <p role="alert" className="mt-2 break-words text-xs text-rose-400">{syncError}</p>
          )}
          <div className="mt-5 flex justify-center gap-2">
            <button
              type="button"
              onClick={retrySync}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
            >
              <RefreshCw className="h-4 w-4" />
              {language === 'ru' ? 'Повторить' : 'Retry'}
            </button>
            <button
              type="button"
              onClick={handleAccountAction}
              className="inline-flex items-center gap-2 rounded-xl border border-[#30363d] px-4 py-2 text-sm text-neutral-300 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              {language === 'ru' ? 'Выйти' : 'Sign out'}
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!isGuest && !session) {
    return (
      <AuthScreen
        language={language}
        isLoading={isAuthLoading}
        authError={authError}
        onGuest={() => setIsGuest(true)}
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#0d1117] text-neutral-200 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#161b22] border-b md:border-b-0 md:border-r border-[#30363d] flex flex-col shrink-0 z-20">
        <div className="p-4 md:p-6 flex items-center gap-3 border-b border-[#30363d] shrink-0">
          <Calculator className="w-6 h-6 text-emerald-400" />
          <h1 className="text-xl font-semibold tracking-tight text-white mr-auto">{t('app_title')}</h1>
          <div className="flex md:hidden items-center gap-1.5">
            <button
              onClick={() => setIsResetOpen(true)}
              className="p-1.5 text-neutral-500 hover:text-neutral-300 bg-[#0d1117] border border-[#30363d] rounded-lg transition-colors"
              title={language === 'ru' ? 'Сброс счетов и операций' : 'Reset Accounts & Transactions'}
            >
              <Trash2 className="w-4 h-4 text-neutral-500" />
            </button>
            <button
              onClick={() => setIsImportOpen(true)}
              className="p-1.5 text-neutral-300 hover:text-white bg-[#0d1117] border border-[#30363d] rounded-lg"
              title={language === 'ru' ? 'Импорт финансов' : 'Import Finances'}
            >
              <Upload className="w-4 h-4 text-sky-400" />
            </button>
            <button
              onClick={() => openExportModal(activeTab === 'accounts' ? 'accounts' : activeTab === 'payments' ? 'payments' : activeTab === 'purchases' ? 'goals_purchases' : activeTab === 'transactions' ? 'transactions' : 'full_report')}
              className="p-1.5 text-neutral-300 hover:text-white bg-[#0d1117] border border-[#30363d] rounded-lg"
              title={language === 'ru' ? 'Экспорт данных' : 'Export Data'}
            >
              <Download className="w-4 h-4 text-emerald-400" />
            </button>
            <select value={language} onChange={e => setLanguage(e.target.value as 'en' | 'ru')} className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-300 outline-none">
              <option value="en">EN</option><option value="ru">RU</option>
            </select>
          </div>
        </div>
        
        <nav className="flex-none md:flex-1 overflow-x-auto md:overflow-y-auto p-3 md:p-4 flex flex-row md:flex-col gap-2 space-y-0 md:space-y-1.5 compact-scrollbar">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex-none md:w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400' : 'text-neutral-400 hover:bg-[#30363d]/30 hover:text-neutral-200'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            {t('nav_overview')}
          </button>
          
          <button 
            onClick={() => setActiveTab('accounts')}
            className={`flex-none md:w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'accounts' ? 'bg-emerald-500/10 text-emerald-400' : 'text-neutral-400 hover:bg-[#30363d]/30 hover:text-neutral-200'}`}
          >
            <PiggyBank className="w-4 h-4" />
            {t('nav_accounts')}
          </button>
          
          <button 
            onClick={() => setActiveTab('purchases')}
            className={`flex-none md:w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'purchases' ? 'bg-emerald-500/10 text-emerald-400' : 'text-neutral-400 hover:bg-[#30363d]/30 hover:text-neutral-200'}`}
          >
            <ShoppingBag className="w-4 h-4" />
            {t('nav_purchases')}
          </button>
          
          <button 
            onClick={() => setActiveTab('payments')}
            className={`flex-none md:w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'payments' ? 'bg-emerald-500/10 text-emerald-400' : 'text-neutral-400 hover:bg-[#30363d]/30 hover:text-neutral-200'}`}
          >
            <CalendarDays className="w-4 h-4" />
            {t('nav_payments')}
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`flex-none md:w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'bg-emerald-500/10 text-emerald-400' : 'text-neutral-400 hover:bg-[#30363d]/30 hover:text-neutral-200'}`}
          >
            <Repeat className="w-4 h-4" />
            {t('nav_transactions') || 'Transactions'}
          </button>
        </nav>

        <div className="flex items-center justify-between gap-2 border-t border-[#30363d] px-3 py-2 md:px-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-neutral-300">
              {session?.user.email || (language === 'ru' ? 'Гостевой режим' : 'Guest mode')}
            </p>
            <p
              className={`truncate text-[10px] ${syncStatus === 'error' ? 'text-rose-400' : 'text-neutral-500'}`}
              title={syncError || undefined}
            >
              {isGuest
                ? (language === 'ru' ? 'Данные только на этом устройстве' : 'Data stays on this device')
                : syncStatus === 'loading'
                  ? (language === 'ru' ? 'Загрузка данных…' : 'Loading data…')
                  : syncStatus === 'saving'
                    ? (language === 'ru' ? 'Синхронизация…' : 'Syncing…')
                    : syncStatus === 'error'
                      ? (language === 'ru' ? 'Ошибка синхронизации' : 'Sync error')
                      : (language === 'ru' ? 'Синхронизировано' : 'Synced')}
            </p>
            {syncStatus === 'error' && syncError && (
              <p role="alert" className="max-w-40 truncate text-[10px] text-rose-400" title={syncError}>
                {syncError}
              </p>
            )}
          </div>
          {session && syncStatus === 'error' && (
            <button
              type="button"
              onClick={retrySync}
              title={syncError || (language === 'ru' ? 'Повторить синхронизацию' : 'Retry sync')}
              className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-[#30363d] hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleAccountAction}
            disabled={Boolean(session && (syncStatus === 'loading' || syncStatus === 'saving'))}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#30363d] bg-[#0d1117] px-2 py-1.5 text-[11px] font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white disabled:cursor-wait disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {session
              ? (language === 'ru' ? 'Выйти' : 'Sign out')
              : (language === 'ru' ? 'Войти' : 'Sign in')}
          </button>
        </div>

        <div className="hidden md:flex p-4 border-t border-[#30363d] flex-col gap-2.5 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => openExportModal(activeTab === 'accounts' ? 'accounts' : activeTab === 'payments' ? 'payments' : activeTab === 'purchases' ? 'goals_purchases' : activeTab === 'transactions' ? 'transactions' : 'full_report')}
              className="px-2.5 py-2 flex items-center justify-center gap-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:border-emerald-500/50 transition-colors"
              title={language === 'ru' ? 'Экспорт данных (CSV, JSON)' : 'Export Data (CSV, JSON)'}
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('export_csv') || (language === 'ru' ? 'Экспорт' : 'Export')}</span>
            </button>
            <button 
              onClick={() => setIsImportOpen(true)}
              className="px-2.5 py-2 flex items-center justify-center gap-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:border-sky-500/50 transition-colors"
              title={language === 'ru' ? 'Импорт финансов (CSV, JSON)' : 'Import Finances (CSV, JSON)'}
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>{language === 'ru' ? 'Импорт' : 'Import'}</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select 
              value={language} 
              onChange={e => setLanguage(e.target.value)} 
              className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-300 outline-none focus:border-emerald-500/50 appearance-none text-center"
            >
              <option value="en">EN</option>
              <option value="ru">RU</option>
            </select>
            <select 
              value={currency} 
              onChange={e => setCurrency(e.target.value)} 
              className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-300 outline-none focus:border-emerald-500/50 appearance-none text-center"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="RUB">RUB</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div className="flex justify-center pt-0.5">
            <button 
              onClick={() => setIsResetOpen(true)}
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-400 hover:underline transition-colors py-0.5 px-1.5 rounded"
              title={language === 'ru' ? 'Сброс счетов и операций' : 'Reset Accounts & Transactions'}
            >
              <Trash2 className="w-3 h-3 text-neutral-500" />
              <span>{language === 'ru' ? 'Сброс данных' : 'Reset data'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-h-0 flex flex-col gap-6 bg-[#0d1117] relative overflow-x-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6 max-w-[1280px] w-full mx-auto"
            >
               <PaymentNotifications payments={payments} accounts={accounts} t={t} currency={currency} lang={language} />
               <AnalyticsManager 
                 accounts={accounts} 
                 payments={displayPayments} 
                 salary={salary} 
                 goals={goals} 
                 purchases={purchases} 
                 transactions={transactions} 
                 categories={categories} 
                 t={t} 
                 currency={currency} 
                 lang={language} 
                 setActiveTab={setActiveTab} 
                 capitalAfterPurchases={capitalAfterPurchases} 
                 totalPurchases={totalPurchases} 
                 grossAssets={grossAssets} 
                 totalDebtsAndCredit={totalDebtsAndCredit} 
               />
            </motion.div>
          )}
          
          {activeTab === 'accounts' && (
            <motion.div 
              key="accounts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6 max-w-[1280px] w-full mx-auto"
            >
              <AccountManager 
                accounts={accounts} 
                onAdd={addAccount} 
                onEdit={editAccount} 
                onRemove={removeAccount} 
                onOpenReset={() => setIsResetOpen(true)}
                salary={salary}
                setSalary={setSalary}
                t={t} 
                currency={currency} 
                lang={language} 
              />
              <GoalManager
                goals={goals}
                onAdd={addGoal}
                onEdit={editGoal}
                onRemove={removeGoal}
                t={t}
                currency={currency}
                lang={language}
                freeCash={freeCashFlow}
              />
            </motion.div>
          )}
          
          {activeTab === 'purchases' && (
             <motion.div 
              key="purchases"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6 max-w-[1280px] w-full mx-auto"
             >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <PurchaseManager
                      purchases={purchases || []}
                      onAdd={addPurchase}
                      onEdit={editPurchase}
                      onRemove={removePurchase}
                      t={t}
                      currency={currency}
                      lang={language}
                    />
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className={`${tokens.components.card} p-5 flex flex-col justify-between`}>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <ShoppingBag className="w-4 h-4 text-amber-400" />
                          <h3 className={tokens.typography.cardTitle}>{t('capital_after_purchases')}</h3>
                        </div>
                        <p className={tokens.typography.secondary}>
                          {language === 'ru' 
                            ? 'Остаток капитала после совершения всех запланированных покупок' 
                            : 'Remaining capital after completing all planned purchases'}
                        </p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-[#30363d]/60 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs text-neutral-400">
                          <span>{language === 'ru' ? 'Текущий капитал:' : 'Current Capital:'}</span>
                          <span className="font-mono text-emerald-400 font-semibold">{formatMoney(netWorth, currency, language)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-neutral-400">
                          <span>{language === 'ru' ? 'Сумма покупок:' : 'Planned Purchases:'}</span>
                          <span className="font-mono text-amber-400 font-semibold">-{formatMoney(totalPurchases, currency, language)}</span>
                        </div>
                        <div className="h-px bg-[#30363d]/60 my-1" />
                        <div className="flex justify-between items-center text-sm font-semibold">
                          <span className="text-white">{language === 'ru' ? 'Итог:' : 'Net Remaining:'}</span>
                          <span className={`font-mono text-lg ${capitalAfterPurchases >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatMoney(capitalAfterPurchases, currency, language)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
             </motion.div>
          )}

          {activeTab === 'payments' && (
             <motion.div 
              key="payments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6 max-w-[1280px] w-full mx-auto"
             >
                <PaymentManager 
                  payments={displayPayments.sort((a,b) => {
                    if (a.isFlexible && !b.isFlexible) return -1;
                    if (!a.isFlexible && b.isFlexible) return 1;
                    if (a.isFlexible && b.isFlexible) return 0;
                    return new Date(a.date!).getTime() - new Date(b.date!).getTime();
                  })} 
                  onAdd={addPayment} 
                  onEdit={editPayment}
                  onRemove={removePayment} 
                  onToggle={togglePaymentActive} 
                  t={t} 
                  currency={currency} 
                  lang={language} 
                  accounts={accounts}
                />
             </motion.div>
          )}
          {activeTab === 'transactions' && (
             <motion.div 
              key="transactions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6 max-w-[1280px] w-full mx-auto"
             >
                <TransactionManager 
                  transactions={transactions}
                  categories={categories}
                  accounts={accounts}
                  onAdd={addTransaction}
                  onEdit={editTransaction}
                  onRemove={removeTransaction}
                  onAddCategory={addCategory}
                  onAddPayment={addPayment}
                  onOpenReset={() => setIsResetOpen(true)}
                  t={t}
                  currency={currency}
                  lang={language}
                />
             </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ExportModal 
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        accounts={accounts}
        payments={payments}
        goals={goals}
        purchases={purchases}
        transactions={transactions}
        categories={categories}
        salary={salary}
        currency={currency}
        lang={language}
        t={t}
        initialTable={exportInitialTable}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        accounts={accounts}
        payments={payments}
        goals={goals}
        purchases={purchases}
        transactions={transactions}
        categories={categories}
        salary={salary}
        currency={currency}
        lang={language}
        t={t}
        onImport={importFinanceData}
      />

      <ResetDataModal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onConfirmReset={handleConfirmReset}
        accounts={accounts}
        transactions={transactions}
        payments={payments}
        goals={goals}
        purchases={purchases}
        categories={categories}
        salary={salary}
        currency={currency}
        lang={language}
        t={t}
      />

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-5 right-5 z-[150] flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#161b22] border border-emerald-500/40 text-emerald-300 text-xs font-medium shadow-2xl shadow-emerald-950/50"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CHART_PALETTE = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ef4444', // red
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
  '#a855f7', // violet
  '#e11d48', // rose
  '#0ea5e9', // sky
  '#eab308', // yellow
  '#22c55e', // green
  '#38bdf8', // light blue
  '#94a3b8'  // slate for other
];

interface SmartPieChartProps {
  title: string;
  subtitle?: string;
  data: Array<{ name: string; value: number; color?: string; icon?: any; isOther?: boolean; subCount?: number }>;
  totalAmount: number;
  currency: string;
  lang: string;
  type: 'expense' | 'income' | 'balance';
  emptyMessage: string;
  emptyIcon: any;
  t: (key: TxKey) => string;
}

function SmartPieChart({
  title,
  subtitle,
  data,
  totalAmount,
  currency,
  lang,
  type,
  emptyMessage,
  emptyIcon: EmptyIcon,
  t
}: SmartPieChartProps) {
  const [viewMode, setViewMode] = useState<'donut' | 'bars'>('donut');
  const [showAll, setShowAll] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!data || data.length === 0 || totalAmount <= 0) {
    return (
      <section className="flex flex-col p-5 bg-[#161b22] border border-[#30363d] rounded-2xl min-h-[340px]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-neutral-200">{title}</h3>
            {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-500 text-xs">
          <EmptyIcon className="w-8 h-8 mb-2 opacity-30 text-neutral-400" />
          <p>{emptyMessage}</p>
        </div>
      </section>
    );
  }

  // Calculate percentages and prepare aggregated dataset for donut if too many items
  const shouldAggregate = data.length > 6 && !showAll;
  let chartData: Array<{ name: string; value: number; pct: number; color: string; isOther?: boolean; subCount?: number }> = [];

  if (shouldAggregate) {
    const topItems = data.slice(0, 5).map((item, idx) => ({
      name: item.name,
      value: item.value,
      pct: totalAmount > 0 ? (item.value / totalAmount) * 100 : 0,
      color: item.color || CHART_PALETTE[idx % CHART_PALETTE.length],
      isOther: false
    }));

    const otherItems = data.slice(5);
    const otherSum = otherItems.reduce((s, it) => s + it.value, 0);
    const otherPct = totalAmount > 0 ? (otherSum / totalAmount) * 100 : 0;

    chartData = [
      ...topItems,
      {
        name: lang === 'ru' ? 'Прочее' : 'Other',
        value: otherSum,
        pct: otherPct,
        color: '#94a3b8',
        isOther: true,
        subCount: otherItems.length
      }
    ];
  } else {
    chartData = data.map((item, idx) => ({
      name: item.name,
      value: item.value,
      pct: totalAmount > 0 ? (item.value / totalAmount) * 100 : 0,
      color: item.color || CHART_PALETTE[idx % CHART_PALETTE.length],
      isOther: false
    }));
  }

  // Full detailed list for rank/legend table with exact percentages
  const detailedList = data.map((item, idx) => ({
    name: item.name,
    value: item.value,
    pct: totalAmount > 0 ? (item.value / totalAmount) * 100 : 0,
    color: item.color || CHART_PALETTE[idx % CHART_PALETTE.length]
  }));

  const activeItem = activeIndex !== null ? chartData[activeIndex] : null;

  return (
    <section className="flex flex-col p-4 sm:p-5 bg-[#161b22] border border-[#30363d] rounded-2xl min-h-[380px] shadow-sm">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pb-3 border-b border-[#30363d]/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>
            <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-md ${
              type === 'expense' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {formatMoney(totalAmount, currency, lang)}
            </span>
          </div>
          {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {data.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                showAll 
                  ? 'bg-neutral-800 border-neutral-600 text-neutral-200' 
                  : 'bg-[#0d1117] border-[#30363d] text-neutral-400 hover:text-neutral-200'
              }`}
              title={showAll ? (lang === 'ru' ? 'Группировать в топ-5' : 'Group to top 5') : (lang === 'ru' ? 'Показать все' : 'Show all')}
            >
              {showAll ? (lang === 'ru' ? 'Все' : 'All') : (lang === 'ru' ? 'Топ-5' : 'Top-5')} ({data.length})
            </button>
          )}

          <div className="flex items-center bg-[#0d1117] border border-[#30363d] p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode('donut')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'donut' ? 'bg-emerald-500/20 text-emerald-400' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title={lang === 'ru' ? 'Круговая диаграмма' : 'Donut Chart'}
            >
              <PieChartIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('bars')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'bars' ? 'bg-emerald-500/20 text-emerald-400' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title={lang === 'ru' ? 'Рейтинг категорий' : 'Ranked List'}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'donut' ? (
        <div className="flex flex-col gap-4">
          {/* Donut Chart with Interactive Center */}
          <div className="relative w-full h-[220px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="#161b22"
                  strokeWidth={2}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={(_, index) => setActiveIndex(prev => prev === index ? null : index)}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                      style={{
                        outline: 'none',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s ease, transform 0.2s ease'
                      }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Dynamic Data Info (only in center, no overlapping floating tooltips) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              {activeItem ? (
                <motion.div 
                  key={`active-${activeItem.name}`}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col items-center max-w-[130px]"
                >
                  <div className="flex items-center gap-1.5 max-w-full justify-center">
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: activeItem.color }} 
                    />
                    <span className="text-[11px] text-neutral-300 font-medium truncate" title={activeItem.name}>
                      {activeItem.name}
                    </span>
                  </div>
                  <span className={`text-lg font-bold font-mono leading-tight ${type === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {activeItem.pct.toFixed(1)}%
                  </span>
                  <span className="text-[11px] text-neutral-200 font-mono font-semibold truncate w-full">
                    {formatMoney(activeItem.value, currency, lang)}
                  </span>
                  {activeItem.isOther && (
                    <span className="text-[9px] text-neutral-500 mt-0.5">
                      {lang === 'ru' ? `${activeItem.subCount} категорий` : `${activeItem.subCount} items`}
                    </span>
                  )}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center max-w-[130px]">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                    {lang === 'ru' ? 'Всего' : 'Total'}
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-neutral-100 leading-tight">
                    {formatMoney(totalAmount, currency, lang)}
                  </span>
                  <span className="text-[10px] text-neutral-400 mt-0.5">
                    {data.length} {lang === 'ru' ? 'категорий' : 'categories'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* High-Readability Ranked Breakdown Legend */}
          <div className="flex flex-col gap-1.5 max-h-[190px] overflow-y-auto compact-scrollbar pr-1">
            {detailedList.map((item, idx) => {
              const isItemActive = activeItem && activeItem.name === item.name;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    const matchIdx = chartData.findIndex(c => c.name === item.name || (c.isOther && idx >= 5));
                    if (matchIdx !== -1) setActiveIndex(prev => prev === matchIdx ? null : matchIdx);
                  }}
                  onMouseEnter={() => {
                    const matchIdx = chartData.findIndex(c => c.name === item.name || (c.isOther && idx >= 5));
                    if (matchIdx !== -1) setActiveIndex(matchIdx);
                  }}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                    isItemActive
                      ? 'bg-neutral-800/80 border-neutral-600'
                      : 'bg-[#0d1117]/60 border-transparent hover:border-[#30363d] hover:bg-[#0d1117]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className="text-xs font-medium text-neutral-200 truncate" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-xs font-semibold font-mono text-neutral-100">
                      {formatMoney(item.value, currency, lang)}
                    </span>
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#161b22] border border-[#30363d] text-emerald-400 min-w-[42px] text-right">
                      {item.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Ranked Bars View (High Clarity for many categories) */
        <div className="flex flex-col gap-2.5 overflow-y-auto compact-scrollbar pr-1 max-h-[380px]">
          {detailedList.map((item, idx) => {
            const maxVal = detailedList[0].value || 1;
            const barWidth = Math.min(100, Math.round((item.value / maxVal) * 100));

            return (
              <div key={idx} className="flex flex-col gap-1 p-2 bg-[#0d1117] border border-[#30363d]/60 rounded-xl">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-[#161b22] border border-[#30363d] flex items-center justify-center font-bold text-[10px] text-neutral-400 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-neutral-200 font-medium truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-neutral-100 font-semibold font-mono">{formatMoney(item.value, currency, lang)}</span>
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#161b22] border border-[#30363d] text-emerald-400">
                      {item.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-[#161b22] h-1.5 rounded-full overflow-hidden mt-0.5">
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{ 
                      width: `${barWidth}%`,
                      backgroundColor: item.color 
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AnalyticsManager({ 
  accounts, 
  payments, 
  salary, 
  goals, 
  purchases, 
  transactions, 
  categories, 
  t, 
  currency, 
  lang,
  setActiveTab,
  capitalAfterPurchases,
  totalPurchases,
  grossAssets: propGrossAssets,
  totalDebtsAndCredit: propTotalDebtsAndCredit
}: any) {
  if (accounts.length === 0 && payments.length === 0 && !salary && (goals || []).length === 0 && (purchases || []).length === 0 && (transactions || []).length === 0) return null;

  // Detail dropdown states for primary cards
  const [isCapitalDetailOpen, setIsCapitalDetailOpen] = useState(false);
  const [isIncomeDetailOpen, setIsIncomeDetailOpen] = useState(false);

  // Period State
  const now = new Date();
  const [periodType, setPeriodType] = useState<'month' | 'prev_month' | '30_days' | '90_days' | 'this_year' | 'all_time' | 'custom'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth()); // 0-indexed (0 = Jan, 11 = Dec)
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
    setPeriodType('month');
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
    setPeriodType('month');
  };

  const handleResetToCurrentMonth = () => {
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
    setPeriodType('month');
  };

  // Determine active start & end dates based on filter
  let periodStartDate: Date;
  let periodEndDate: Date;
  let periodTitleLabel: string;
  let isCurrentMonthSelected = false;

  if (periodType === 'month') {
    periodStartDate = new Date(selectedYear, selectedMonth, 1, 0, 0, 0);
    periodEndDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    
    isCurrentMonthSelected = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
    const monthName = periodStartDate.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' });
    periodTitleLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  } else if (periodType === 'prev_month') {
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    periodStartDate = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1, 0, 0, 0);
    periodEndDate = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0, 23, 59, 59);
    const monthName = periodStartDate.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' });
    periodTitleLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  } else if (periodType === '30_days') {
    periodStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    periodEndDate = new Date(now.getTime());
    periodTitleLabel = lang === 'ru' ? 'Последние 30 дней' : 'Last 30 days';
  } else if (periodType === '90_days') {
    periodStartDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    periodEndDate = new Date(now.getTime());
    periodTitleLabel = lang === 'ru' ? 'Последние 90 дней (Квартал)' : 'Last 90 days (Quarter)';
  } else if (periodType === 'this_year') {
    periodStartDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    periodEndDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    periodTitleLabel = `${now.getFullYear()} ${lang === 'ru' ? 'год' : 'year'}`;
  } else if (periodType === 'custom') {
    periodStartDate = customStart ? new Date(customStart) : new Date(0);
    periodEndDate = customEnd ? new Date(customEnd + 'T23:59:59') : new Date();
    periodTitleLabel = lang === 'ru' ? 'Свой интервал дат' : 'Custom date range';
  } else {
    // all_time
    periodStartDate = new Date(0);
    periodEndDate = new Date(8640000000000000);
    periodTitleLabel = lang === 'ru' ? 'Всё время' : 'All time';
  }

  // Filter transactions for chosen period
  const filteredTxs = (transactions || []).filter((tx: any) => {
    const txTime = new Date(tx.date).getTime();
    return txTime >= periodStartDate.getTime() && txTime <= periodEndDate.getTime();
  });

  const periodExpenses = filteredTxs.filter((tx: any) => tx.type === 'expense');
  const periodIncomes = filteredTxs.filter((tx: any) => tx.type === 'income');

  const totalActualExpensesPeriod = periodExpenses.reduce((sum: number, tx: any) => sum + tx.amount, 0);
  const totalActualIncomePeriod = periodIncomes.reduce((sum: number, tx: any) => sum + tx.amount, 0);
  const periodNetBalance = totalActualIncomePeriod - totalActualExpensesPeriod;

  // Monthly deposit interest
  const totalMonthlyInterest = accounts.reduce((sum: number, acc: any) => {
    if ((acc.type === 'deposit' || acc.type === 'savings') && acc.interestRate) {
      return sum + (acc.balance * (acc.interestRate / 100) / 12);
    }
    return sum;
  }, 0);

  // Payments obligations
  const paymentData: any[] = payments.reduce((acc: any[], p: any) => {
    if (!p.isActive) return acc;
    let amount = p.amount;
    if (p.recurrence === 'yearly') amount = amount / 12;
    if (p.recurrence === 'weekly') amount = amount * 52 / 12;
    if (amount <= 0) return acc;
    acc.push({ name: p.name, value: amount });
    return acc;
  }, []);

  const totalMonthlyPlannedObligations = paymentData.reduce((sum: number, p: any) => sum + p.value, 0);

  // Goal data
  const goalData: any[] = (goals || []).map((g: any) => ({
    name: g.name,
    value: g.monthlyContribution || 0,
    target: g.targetAmount || 0,
    saved: g.savedAmount || 0
  })).filter((g: any) => g.value > 0 || g.saved > 0);

  const totalGoalContributions = goalData.reduce((sum: number, g: any) => sum + g.value, 0);

  // Planned Baseline Monthly Figures
  const totalMonthlySalaryIncome = salary + totalMonthlyInterest;
  const plannedMonthlyFreeCash = Math.max(0, totalMonthlySalaryIncome - totalMonthlyPlannedObligations - totalGoalContributions);

  // Period Days calculations
  const daysInSelectedMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const currentDay = now.getDate();
  const remainingDays = isCurrentMonthSelected ? Math.max(1, daysInSelectedMonth - currentDay) : daysInSelectedMonth;
  const totalDaysInPeriod = Math.max(1, Math.round((periodEndDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24)));
  const periodAvgDailySpend = Math.round(totalActualExpensesPeriod / totalDaysInPeriod);

  // Dynamic Free Cash & Safe Spend for Current Month
  const currentMonthSafeRemaining = Math.max(0, plannedMonthlyFreeCash - totalActualExpensesPeriod);
  const currentMonthDailySafeSpend = Math.round(currentMonthSafeRemaining / remainingDays);

  // Cashflow distribution percentages
  const inc = totalActualIncomePeriod || 1;
  const expPct = Math.min(100, (totalActualExpensesPeriod / inc) * 100);
  const goalsPct = Math.min(100, (totalGoalContributions / inc) * 100);
  const freePct = Math.min(100, Math.max(0, (periodNetBalance / inc) * 100));

  // Capital & Real Asset Distribution (strictly real money accounts, excluding credit cards and loans)
  const accountBalances = accounts
    .filter((a: any) => a.balance > 0 && a.type !== 'debt' && a.type !== 'credit')
    .map((a: any) => ({ name: a.name, value: a.balance }));
    
  const totalCreditDebt = accounts
    .filter((a: any) => a.type === 'credit')
    .reduce((sum: number, a: any) => {
      const limit = a.creditLimit !== undefined && a.creditLimit !== null && a.creditLimit > 0 ? a.creditLimit : a.balance;
      const debtFromLimit = Math.max(0, limit - a.balance);
      const negDebt = a.balance < 0 ? Math.abs(a.balance) : 0;
      return sum + Math.max(debtFromLimit, negDebt);
    }, 0);

  // Real money currently available: checking, savings, deposit, cash, crypto
  const ownAssets = accounts.filter((a: any) => a.type !== 'debt' && a.type !== 'credit').reduce((s: number, a: any) => s + (a.balance > 0 ? a.balance : 0), 0);
  const totalAssets = ownAssets;
  const totalDebts = accounts.filter((a: any) => a.type === 'debt').reduce((s: number, a: any) => s + Math.abs(a.balance), 0);
  // Capital strictly counts real money available right now: no credit limits, cards or debts added or subtracted
  const netWorth = ownAssets;

  const effectiveGrossAssets = totalAssets;
  const effectiveTotalDebtsAndCredit = totalCreditDebt + totalDebts;

  const totalPurchasesAmount = totalPurchases !== undefined 
    ? totalPurchases 
    : ((purchases || []).reduce((sum: number, p: any) => sum + (p.price || p.amount || 0), 0));
  const effectiveCapitalAfterPurchases = capitalAfterPurchases !== undefined 
    ? capitalAfterPurchases 
    : (netWorth - totalPurchasesAmount);

  // Liquid assets (cash, checking, savings) for runway calculation
  const liquidAssets = accounts
    .filter((a: any) => ['checking', 'savings', 'cash'].includes(a.type) && a.balance > 0)
    .reduce((s: number, a: any) => s + a.balance, 0);

  // Expense By Category for chosen period
  const expenseByCategoryMap = periodExpenses.reduce((acc: any, tx: any) => {
    const cat = (categories || []).find((c: any) => c.id === tx.categoryId);
    const catName = cat ? (t(cat.name) || cat.name) : (lang === 'ru' ? 'Прочее' : 'Other');
    acc[catName] = (acc[catName] || 0) + tx.amount;
    return acc;
  }, {});
  
  const expenseByCategory = Object.keys(expenseByCategoryMap)
    .map(key => ({ name: key, value: expenseByCategoryMap[key] }))
    .sort((a, b) => b.value - a.value);

  // Income By Category for chosen period - STRICTLY FROM TRANSACTIONS IN PERIOD
  const incomeByCategoryMap = periodIncomes.reduce((acc: any, tx: any) => {
    const cat = (categories || []).find((c: any) => c.id === tx.categoryId);
    const catName = cat ? (t(cat.name) || cat.name) : (lang === 'ru' ? 'Основной доход' : 'Base income');
    acc[catName] = (acc[catName] || 0) + tx.amount;
    return acc;
  }, {});

  const incomeByCategory = Object.keys(incomeByCategoryMap)
    .map(key => ({ name: key, value: incomeByCategoryMap[key] }))
    .sort((a, b) => b.value - a.value);

  const totalEffectiveIncome = totalActualIncomePeriod;

  // Smart KPIs
  const monthlyBurn = totalMonthlyPlannedObligations > 0 ? totalMonthlyPlannedObligations : (totalActualExpensesPeriod > 0 ? totalActualExpensesPeriod : 1);
  const financialRunwayMonths = totalAssets > 0 ? (totalAssets / monthlyBurn) : 0;

  // Savings rate calculation based strictly on chosen period transactions
  const hasPeriodIncome = totalActualIncomePeriod > 0;
  const periodActualSaved = totalActualIncomePeriod - totalActualExpensesPeriod;
  const savingsRate = hasPeriodIncome 
    ? (periodActualSaved > 0 ? Math.min(100, Math.round((periodActualSaved / totalActualIncomePeriod) * 100)) : 0)
    : null;

  // Cashflow Trend (last 6-12 months dynamically calculated)
  const monthlyTrendMap = (transactions || []).reduce((acc: any, tx: any) => {
    const d = new Date(tx.date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[monthKey]) acc[monthKey] = { name: monthKey, income: 0, expense: 0, net: 0, date: d };
    if (tx.type === 'income') acc[monthKey].income += tx.amount;
    if (tx.type === 'expense') acc[monthKey].expense += tx.amount;
    acc[monthKey].net = acc[monthKey].income - acc[monthKey].expense;
    return acc;
  }, {});
  
  const trendData = Object.keys(monthlyTrendMap)
    .sort()
    .slice(-8)
    .map(key => {
      const d = monthlyTrendMap[key].date;
      const monthName = d.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short' });
      return {
        ...monthlyTrendMap[key],
        name: monthName
      };
    });

  const monthOptions = [
    { value: 0, nameRu: 'Январь', nameEn: 'January' },
    { value: 1, nameRu: 'Февраль', nameEn: 'February' },
    { value: 2, nameRu: 'Март', nameEn: 'March' },
    { value: 3, nameRu: 'Апрель', nameEn: 'April' },
    { value: 4, nameRu: 'Май', nameEn: 'May' },
    { value: 5, nameRu: 'Июнь', nameEn: 'June' },
    { value: 6, nameRu: 'Июль', nameEn: 'July' },
    { value: 7, nameRu: 'Август', nameEn: 'August' },
    { value: 8, nameRu: 'Сентябрь', nameEn: 'September' },
    { value: 9, nameRu: 'Октябрь', nameEn: 'October' },
    { value: 10, nameRu: 'Ноябрь', nameEn: 'November' },
    { value: 11, nameRu: 'Декабрь', nameEn: 'December' },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      
      {/* 1. Interactive Period & Month Toolbar */}
      <div className="flex flex-col gap-3.5 p-4 sm:p-5 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Quick Filter Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto compact-scrollbar pb-1">
            <button
              onClick={() => { setPeriodType('month'); handleResetToCurrentMonth(); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                periodType === 'month' && isCurrentMonthSelected
                  ? 'bg-emerald-500 text-neutral-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-[#0d1117] border border-[#30363d] text-neutral-300 hover:text-white hover:border-neutral-500'
              }`}
            >
              {lang === 'ru' ? 'Этот месяц' : 'This Month'}
            </button>

            <button
              onClick={() => setPeriodType('prev_month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                periodType === 'prev_month'
                  ? 'bg-emerald-500 text-neutral-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-[#0d1117] border border-[#30363d] text-neutral-300 hover:text-white hover:border-neutral-500'
              }`}
            >
              {lang === 'ru' ? 'Прошлый месяц' : 'Prev Month'}
            </button>

            <button
              onClick={() => setPeriodType('30_days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                periodType === '30_days'
                  ? 'bg-emerald-500 text-neutral-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-[#0d1117] border border-[#30363d] text-neutral-300 hover:text-white hover:border-neutral-500'
              }`}
            >
              30 {lang === 'ru' ? 'дней' : 'Days'}
            </button>

            <button
              onClick={() => setPeriodType('90_days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                periodType === '90_days'
                  ? 'bg-emerald-500 text-neutral-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-[#0d1117] border border-[#30363d] text-neutral-300 hover:text-white hover:border-neutral-500'
              }`}
            >
              90 {lang === 'ru' ? 'дней' : 'Days'}
            </button>

            <button
              onClick={() => setPeriodType('this_year')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                periodType === 'this_year'
                  ? 'bg-emerald-500 text-neutral-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-[#0d1117] border border-[#30363d] text-neutral-300 hover:text-white hover:border-neutral-500'
              }`}
            >
              {lang === 'ru' ? 'Этот год' : 'This Year'}
            </button>

            <button
              onClick={() => setPeriodType('all_time')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                periodType === 'all_time'
                  ? 'bg-emerald-500 text-neutral-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-[#0d1117] border border-[#30363d] text-neutral-300 hover:text-white hover:border-neutral-500'
              }`}
            >
              {lang === 'ru' ? 'Всё время' : 'All Time'}
            </button>

            <button
              onClick={() => setPeriodType('custom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                periodType === 'custom'
                  ? 'bg-emerald-500 text-neutral-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-[#0d1117] border border-[#30363d] text-neutral-300 hover:text-white hover:border-neutral-500'
              }`}
            >
              {lang === 'ru' ? 'Интервал' : 'Range'}
            </button>
          </div>

          {/* Month Stepper < Month Year > */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <div className="flex items-center bg-[#0d1117] border border-[#30363d] rounded-xl p-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                title={lang === 'ru' ? 'Предыдущий месяц' : 'Previous month'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                  className="px-3 py-1 text-xs font-semibold text-neutral-200 hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {monthOptions[selectedMonth][lang === 'ru' ? 'nameRu' : 'nameEn']} {selectedYear}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {showMonthDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-2 z-50">
                    <div className="flex items-center justify-between px-2 py-1 mb-2 border-b border-[#30363d]">
                      <span className="text-xs font-bold text-neutral-300">{lang === 'ru' ? 'Выберите месяц' : 'Select Month'}</span>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setSelectedYear(selectedYear - 1)}
                          className="px-1.5 py-0.5 text-xs text-neutral-400 hover:text-white bg-[#0d1117] rounded"
                        >
                          -1
                        </button>
                        <span className="text-xs font-mono font-bold text-emerald-400">{selectedYear}</span>
                        <button 
                          onClick={() => setSelectedYear(selectedYear + 1)}
                          className="px-1.5 py-0.5 text-xs text-neutral-400 hover:text-white bg-[#0d1117] rounded"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto compact-scrollbar">
                      {monthOptions.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => {
                            setSelectedMonth(m.value);
                            setPeriodType('month');
                            setShowMonthDropdown(false);
                          }}
                          className={`text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                            selectedMonth === m.value 
                              ? 'bg-emerald-500/20 text-emerald-300 font-semibold' 
                              : 'text-neutral-300 hover:bg-neutral-800'
                          }`}
                        >
                          {m[lang === 'ru' ? 'nameRu' : 'nameEn']}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleNextMonth}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                title={lang === 'ru' ? 'Следующий месяц' : 'Next month'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {(!isCurrentMonthSelected || periodType !== 'month') && (
              <button
                onClick={handleResetToCurrentMonth}
                className="text-[11px] font-medium text-neutral-400 hover:text-emerald-400 px-2.5 py-1.5 rounded-xl border border-[#30363d] bg-[#0d1117] transition-colors"
              >
                {lang === 'ru' ? 'Текущий' : 'Today'}
              </button>
            )}
          </div>
        </div>

        {/* Custom date range picker if custom selected */}
        {periodType === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#30363d]/60 text-xs">
            <span className="text-neutral-400">{lang === 'ru' ? 'С:' : 'From:'}</span>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-neutral-200 text-xs outline-none focus:border-emerald-500/50"
            />
            <span className="text-neutral-400">{lang === 'ru' ? 'По:' : 'To:'}</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-neutral-200 text-xs outline-none focus:border-emerald-500/50"
            />
          </div>
        )}

        {/* Period Summary Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#30363d]/60 text-xs">
          <div className="flex items-center gap-2 text-neutral-400">
            <span className="font-semibold text-neutral-200">{periodTitleLabel}</span>
            <span>•</span>
            <span>{filteredTxs.length} {lang === 'ru' ? 'операций' : 'operations'}</span>
          </div>

          <div className="flex items-center gap-4 font-mono">
            <span className="text-emerald-400">
              {lang === 'ru' ? 'Доходы:' : 'Income:'} <strong>+{formatMoney(totalActualIncomePeriod, currency, lang)}</strong>
            </span>
            <span className="text-red-400">
              {lang === 'ru' ? 'Расходы:' : 'Expenses:'} <strong>-{formatMoney(totalActualExpensesPeriod, currency, lang)}</strong>
            </span>
            <span className={`font-bold ${periodNetBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {lang === 'ru' ? 'Сальдо:' : 'Net:'} {periodNetBalance >= 0 ? '+' : ''}{formatMoney(periodNetBalance, currency, lang)}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Dashboard Cards: Aligned with Selected Period */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 shrink-0">
        {/* Card 1: Capital (Real Money Only) */}
        <DashboardCard 
          title={lang === 'ru' ? 'Капитал' : 'Capital'}
          amount={netWorth} 
          currency={currency} 
          lang={lang} 
          badge={lang === 'ru' ? 'Настоящие деньги' : 'Real funds'}
          icon={<Wallet className="w-4 h-4 text-emerald-400" />} 
          subtitle={lang === 'ru' ? 'Настоящие деньги на текущий момент' : 'Real money currently available'}
          isClickable
          onClick={() => setIsCapitalDetailOpen(!isCapitalDetailOpen)}
          isDetailOpen={isCapitalDetailOpen}
          detailsContent={
            <div className="mt-3 pt-2.5 border-t border-[#30363d]/60 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between text-neutral-400">
                <span>{lang === 'ru' ? 'Счета, вклады и наличные:' : 'Accounts, deposits & cash:'}</span>
                <span className="font-mono font-semibold text-emerald-400">+{formatMoney(effectiveGrossAssets, currency, lang)}</span>
              </div>
              {effectiveTotalDebtsAndCredit > 0 && (
                <div className="flex items-center justify-between text-neutral-400">
                  <span>{lang === 'ru' ? 'Кредиты и карты (учитываются отдельно):' : 'Credit & debts (tracked separately):'}</span>
                  <span className="font-mono text-neutral-400">
                    {formatMoney(effectiveTotalDebtsAndCredit, currency, lang)}
                  </span>
                </div>
              )}
              {totalPurchasesAmount > 0 && (
                <div className="flex items-center justify-between text-neutral-400">
                  <span>{lang === 'ru' ? 'Запланированные покупки:' : 'Planned purchases:'}</span>
                  <span className="font-mono text-amber-400">-{formatMoney(totalPurchasesAmount, currency, lang)}</span>
                </div>
              )}
              {totalPurchasesAmount > 0 && (
                <div className="flex items-center justify-between text-neutral-300 font-medium pt-1 border-t border-[#30363d]/40">
                  <span>{lang === 'ru' ? 'Остаток после покупок:' : 'After purchases:'}</span>
                  <span className="font-mono text-emerald-400 font-semibold">{formatMoney(effectiveCapitalAfterPurchases, currency, lang)}</span>
                </div>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveTab?.('accounts'); }}
                className="mt-1 text-[11px] text-neutral-300 hover:text-white font-medium flex items-center justify-center gap-1.5 py-1.5 bg-[#0d1117] rounded-lg border border-[#30363d] hover:border-neutral-500 transition-colors"
              >
                <span>{lang === 'ru' ? 'Управление счетами' : 'Manage accounts'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          }
        />

        {/* Card 2: Period Income */}
        <DashboardCard 
          title={lang === 'ru' ? 'Доход за период' : 'Period Income'}
          amount={totalActualIncomePeriod} 
          currency={currency} 
          lang={lang} 
          badge={periodTitleLabel}
          icon={<Briefcase className="w-4 h-4 text-blue-400" />} 
          subtitle={
            periodIncomes.length > 0 
              ? (lang === 'ru' 
                  ? `${periodIncomes.length} ${periodIncomes.length === 1 ? 'операция' : 'операций'} дохода` 
                  : `${periodIncomes.length} income operations`)
              : (lang === 'ru' ? '0 операций дохода за период' : '0 income operations in period')
          }
          isClickable
          onClick={() => setIsIncomeDetailOpen(!isIncomeDetailOpen)}
          isDetailOpen={isIncomeDetailOpen}
          detailsContent={
            <div className="mt-3 pt-2.5 border-t border-[#30363d]/60 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between text-neutral-400">
                <span>{lang === 'ru' ? 'Доход периода:' : 'Period income:'}</span>
                <span className="font-mono font-bold text-emerald-400">+{formatMoney(totalActualIncomePeriod, currency, lang)}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-400">
                <span>{lang === 'ru' ? 'Операций поступления:' : 'Income transactions count:'}</span>
                <span className="font-mono text-neutral-200">{periodIncomes.length}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-400">
                <span>{lang === 'ru' ? 'Базовый ориентир зарплаты:' : 'Baseline monthly salary:'}</span>
                <span className="font-mono text-neutral-300">{formatMoney(salary, currency, lang)}/мес</span>
              </div>
              {totalMonthlyInterest > 0 && (
                <div className="flex items-center justify-between text-neutral-400">
                  <span>{lang === 'ru' ? 'Расчетные проценты по вкладам:' : 'Estimated deposit yield:'}</span>
                  <span className="font-mono text-neutral-300">+{formatMoney(Math.round(totalMonthlyInterest), currency, lang)}/мес</span>
                </div>
              )}
            </div>
          }
        />

        {/* Card 3: Free Cash / Period Net */}
        <DashboardCard 
          title={isCurrentMonthSelected 
            ? (lang === 'ru' ? 'Свободный остаток' : 'Free Cash') 
            : (lang === 'ru' ? 'Сальдо за период' : 'Period Net')}
          amount={isCurrentMonthSelected ? currentMonthSafeRemaining : periodNetBalance} 
          currency={currency} 
          lang={lang} 
          badge={periodTitleLabel}
          icon={<TrendingUp className={`w-4 h-4 ${((isCurrentMonthSelected ? currentMonthSafeRemaining : periodNetBalance) >= 0) ? 'text-emerald-400' : 'text-red-400'}`} />} 
          subtitle={
            isCurrentMonthSelected
              ? (lang === 'ru' 
                  ? `Безопасно: ${formatMoney(currentMonthDailySafeSpend, currency, lang)}/день (${remainingDays} дн.)`
                  : `Safe spend: ${formatMoney(currentMonthDailySafeSpend, currency, lang)}/day (${remainingDays}d)`)
              : (lang === 'ru' 
                  ? `Доходы: +${formatMoney(totalActualIncomePeriod, currency, lang)} · Расходы: -${formatMoney(totalActualExpensesPeriod, currency, lang)}`
                  : `Income: +${formatMoney(totalActualIncomePeriod, currency, lang)} · Spend: -${formatMoney(totalActualExpensesPeriod, currency, lang)}`)
          }
          isHighlight 
          isNegative={(isCurrentMonthSelected ? currentMonthSafeRemaining : periodNetBalance) < 0} 
        />
      </div>

      {/* 2. Secondary Metrics Bar (Monthly Obligations, Capital after Purchases, Runway, Savings Rate, Daily Safe Spend) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            {lang === 'ru' ? 'Вторичные показатели и резервы' : 'Secondary Metrics & Reserves'}
          </span>
          <span className="text-[11px] text-neutral-500">
            {lang === 'ru' ? 'Детализация и прогноз' : 'Details & Forecast'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Secondary 1: Monthly Obligations */}
          <div 
            onClick={() => setActiveTab?.('payments')}
            className="flex flex-col p-4 bg-[#161b22] border border-[#30363d] rounded-2xl relative overflow-hidden group hover:border-red-500/40 cursor-pointer transition-all justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400">{t('obligations')}</span>
                <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                  <CalendarDays className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
                  {formatMoney(totalMonthlyPlannedObligations, currency, lang)}
                </span>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-[#30363d]/50 flex items-center justify-between text-[11px] text-neutral-500 group-hover:text-neutral-400">
              <span className="truncate">{paymentData.length} {lang === 'ru' ? 'регулярных платежей' : 'regular bills'}</span>
              <ArrowRight className="w-3 h-3 text-red-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Secondary 2: Capital after purchases */}
          <div 
            onClick={() => setActiveTab?.('purchases')}
            className="flex flex-col p-4 bg-[#161b22] border border-[#30363d] rounded-2xl relative overflow-hidden group hover:border-amber-500/40 cursor-pointer transition-all justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400">{t('capital_after_purchases')}</span>
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className={`text-xl sm:text-2xl font-bold tracking-tight font-mono ${effectiveCapitalAfterPurchases < 0 ? 'text-red-400' : 'text-neutral-100'}`}>
                  {formatMoney(effectiveCapitalAfterPurchases, currency, lang)}
                </span>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-[#30363d]/50 flex items-center justify-between text-[11px] text-neutral-500 group-hover:text-neutral-400">
              <span className="truncate">
                {totalPurchasesAmount > 0 
                  ? (lang === 'ru' ? `План: -${formatMoney(totalPurchasesAmount, currency, lang)}` : `Plan: -${formatMoney(totalPurchasesAmount, currency, lang)}`)
                  : (lang === 'ru' ? 'Нет плановых трат' : 'No planned purchases')}
              </span>
              <ArrowRight className="w-3 h-3 text-amber-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Secondary 3: Passive Income from Deposits/Savings */}
          <div 
            onClick={() => setActiveTab?.('accounts')}
            className="flex flex-col p-4 bg-[#161b22] border border-[#30363d] rounded-2xl relative overflow-hidden group hover:border-teal-500/40 cursor-pointer transition-all justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400">
                  {lang === 'ru' ? 'Пассивный доход' : 'Monthly Yield'}
                </span>
                <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <PiggyBank className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-teal-400 font-mono">
                  +{formatMoney(Math.round(totalMonthlyInterest), currency, lang)}
                </span>
                <span className="text-[11px] text-neutral-400 font-medium">/ {lang === 'ru' ? 'мес' : 'mo'}</span>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-[#30363d]/50 flex items-center justify-between text-[11px] text-neutral-500 group-hover:text-neutral-400">
              <span className="truncate">
                {totalMonthlyInterest > 0 
                  ? (lang === 'ru' ? 'По вкладам и счетам' : 'From deposits & savings') 
                  : (lang === 'ru' ? 'Нет доходных вкладов' : 'No interest accounts')}
              </span>
              <ArrowRight className="w-3 h-3 text-teal-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Secondary 3: Financial Runway */}
          <div className="flex flex-col p-4 bg-[#161b22] border border-[#30363d] rounded-2xl relative overflow-hidden group hover:border-emerald-500/40 transition-all justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400">{t('financial_runway')}</span>
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
                  {financialRunwayMonths >= 100 ? '99+' : financialRunwayMonths.toFixed(1)}
                </span>
                <span className="text-xs text-neutral-400 font-medium">{t('months')}</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed truncate">
                {formatMoney(liquidAssets, currency, lang)} {lang === 'ru' ? 'ликвидных' : 'liquid'}
              </p>
              <div className="mt-2 w-full bg-[#0d1117] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (financialRunwayMonths / 12) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Secondary 4: Savings Rate */}
          <div className="flex flex-col p-4 bg-[#161b22] border border-[#30363d] rounded-2xl relative overflow-hidden group hover:border-blue-500/40 transition-all justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400">{t('savings_rate')}</span>
                <div className={`p-1.5 rounded-lg border ${
                  savingsRate === null 
                    ? 'bg-neutral-800 text-neutral-400 border-neutral-700' 
                    : savingsRate <= 0 
                      ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className={`text-xl sm:text-2xl font-bold tracking-tight font-mono ${
                  savingsRate === null 
                    ? 'text-neutral-400' 
                    : savingsRate <= 0 
                      ? 'text-red-400' 
                      : savingsRate >= 20 
                        ? 'text-emerald-400' 
                        : 'text-blue-400'
                }`}>
                  {savingsRate !== null ? `${savingsRate}%` : '—'}
                </span>
                <span className={`text-xs font-medium ${
                  savingsRate === null 
                    ? 'text-neutral-500' 
                    : savingsRate <= 0 
                      ? 'text-red-400' 
                      : savingsRate >= 20 
                        ? 'text-emerald-400' 
                        : 'text-neutral-400'
                }`}>
                  {savingsRate === null 
                    ? (lang === 'ru' ? 'Нет доходов' : 'No income') 
                    : savingsRate <= 0 
                      ? (lang === 'ru' ? 'Дефицит' : 'Deficit') 
                      : savingsRate >= 20 
                        ? (lang === 'ru' ? 'Отлично' : 'Great') 
                        : (lang === 'ru' ? 'Стандарт' : 'Normal')}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed truncate">
                {savingsRate === null 
                  ? (lang === 'ru' ? 'За выбранный период доходов не поступало' : 'No income in this period') 
                  : t('savings_rate_desc')}
              </p>
              <div className="mt-2 w-full bg-[#0d1117] h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    savingsRate === null || savingsRate <= 0 ? 'bg-red-500/40' : 'bg-blue-500'
                  }`}
                  style={{ width: `${savingsRate !== null && savingsRate > 0 ? Math.min(100, savingsRate) : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Secondary 5: Daily Safe Limit / Avg Daily Spend */}
          <div className="flex flex-col p-4 bg-[#161b22] border border-[#30363d] rounded-2xl relative overflow-hidden group hover:border-yellow-500/40 transition-all justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400">
                  {isCurrentMonthSelected ? t('daily_budget_safe') : (lang === 'ru' ? 'Средний расход / день' : 'Avg Daily Spend')}
                </span>
                <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-yellow-400 font-mono">
                  {formatMoney(isCurrentMonthSelected ? currentMonthDailySafeSpend : periodAvgDailySpend, currency, lang)}
                </span>
                <span className="text-[11px] text-neutral-400 font-medium">/ {lang === 'ru' ? 'день' : 'day'}</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed truncate">
                {isCurrentMonthSelected 
                  ? `${remainingDays} ${lang === 'ru' ? 'дн. до конца месяца' : 'days left'}` 
                  : `${totalDaysInPeriod} ${lang === 'ru' ? 'дн. в периоде' : 'days in period'}`}
              </p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400 font-medium">
                <span>{isCurrentMonthSelected ? (lang === 'ru' ? 'Остаток:' : 'Free:') : (lang === 'ru' ? 'Всего:' : 'Total:')}</span>
                <span className={`font-mono font-semibold ${isCurrentMonthSelected ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatMoney(isCurrentMonthSelected ? currentMonthSafeRemaining : totalActualExpensesPeriod, currency, lang)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Responsive 3-Column Section on ≥1280px (Cashflow Distribution, Dynamics Trend, Recent Operations) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Col 1: Cashflow Allocation */}
        <section className={`${tokens.components.card} p-5 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between">
              <h3 className={tokens.typography.cardTitle}>{t('cashflow_dist')}</h3>
              <span className={`${tokens.components.badgeBase} ${tokens.colors.neutral.badge}`}>
                {periodTitleLabel}
              </span>
            </div>
            <p className={`${tokens.typography.secondary} mt-0.5`}>
              {totalActualIncomePeriod > 0 
                ? (lang === 'ru' ? 'Распределение доходов' : 'Income allocation')
                : (lang === 'ru' ? 'Денежный поток за период' : 'Cashflow for period')}
            </p>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div>
              <span className={tokens.typography.kpiSecondary}>{formatMoney(totalActualIncomePeriod, currency, lang)}</span>
              <span className={`${tokens.typography.secondary} ml-2`}>({lang === 'ru' ? 'доход периода' : 'period income'})</span>
            </div>
            <span className={`${tokens.components.badgeBase} ${totalActualIncomePeriod > 0 ? tokens.colors.income.badge : tokens.colors.neutral.badge} uppercase tracking-wider`}>
              {t('income')}
            </span>
          </div>

          {totalActualIncomePeriod > 0 ? (
            <div className="mt-3">
              <div className="h-3 w-full bg-[#0d1117] rounded-full overflow-hidden flex shadow-inner">
                {expPct > 0 && <div style={{width: `${expPct}%`}} className="bg-rose-500 hover:bg-rose-400 transition-colors" title={t('obligations')} />}
                {goalsPct > 0 && <div style={{width: `${goalsPct}%`}} className="bg-blue-500 hover:bg-blue-400 transition-colors" title={t('tab_goals')} />}
                {freePct > 0 && <div style={{width: `${freePct}%`}} className="bg-emerald-500 hover:bg-emerald-400 transition-colors" title={t('monthly_free_cash')} />}
              </div>
              <div className="flex flex-wrap items-center justify-between text-xs text-neutral-400 mt-2.5 font-medium">
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> <span className="text-neutral-300">{lang === 'ru' ? 'Расходы' : 'Spend'}</span> {expPct.toFixed(0)}%</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> <span className="text-neutral-300">{t('tab_goals')}</span> {goalsPct.toFixed(0)}%</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> <span className="text-neutral-300">{lang === 'ru' ? 'Остаток' : 'Retained'}</span> {freePct.toFixed(0)}%</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-3 bg-[#0d1117] border border-[#30363d]/60 rounded-xl text-xs mt-3">
              <div className="flex items-center justify-between text-neutral-400">
                <span>{lang === 'ru' ? 'Доходы за период:' : 'Income in period:'}</span>
                <span className="font-mono text-neutral-200">0 {currency}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-400">
                <span>{lang === 'ru' ? 'Расходы:' : 'Spend:'}</span>
                <span className="font-mono text-rose-400">-{formatMoney(totalActualExpensesPeriod, currency, lang)}</span>
              </div>
              <div className="h-px bg-[#30363d]/60 my-0.5" />
              <div className="flex items-center justify-between text-neutral-300 font-medium">
                <span>{lang === 'ru' ? 'Итоговое сальдо:' : 'Net cashflow:'}</span>
                <span className={`font-mono font-bold ${periodNetBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {periodNetBalance >= 0 ? '+' : ''}{formatMoney(periodNetBalance, currency, lang)}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Col 2: Cashflow Trend Chart */}
        <section className={`${tokens.components.card} p-5 flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className={tokens.typography.cardTitle}>{lang === 'ru' ? 'Динамика сальдо' : 'Cashflow Dynamics'}</h3>
              <p className={tokens.typography.secondary}>{lang === 'ru' ? 'Тренд доходов и расходов по месяцам' : 'Monthly income vs expenses trend'}</p>
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="h-[175px] w-full mt-2">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="miniColorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="miniColorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" opacity={0.4} />
                  <XAxis dataKey="name" stroke="#8b949e" fontSize={11} tickLine={false} />
                  <YAxis stroke="#8b949e" fontSize={11} tickLine={false} width={40} tickFormatter={v => v >= 1000 ? `${Math.round(v/1000)}k` : v} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: any) => formatMoney(val, currency, lang)}
                  />
                  <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#miniColorInc)" name={lang === 'ru' ? 'Доход' : 'Income'} />
                  <Area type="monotone" dataKey="expense" stroke="#f43f5e" fillOpacity={1} fill="url(#miniColorExp)" name={lang === 'ru' ? 'Расход' : 'Expense'} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400 italic">
                {lang === 'ru' ? 'Недостаточно данных за период' : 'Not enough trend data'}
              </div>
            )}
          </div>
        </section>

        {/* Col 3: Recent Operations */}
        <section className={`${tokens.components.card} p-5 flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className={tokens.typography.cardTitle}>{lang === 'ru' ? 'Последние операции' : 'Recent Operations'}</h3>
              <p className={tokens.typography.secondary}>{filteredTxs.length} {lang === 'ru' ? 'за выбранный период' : 'in selected period'}</p>
            </div>
            <button 
              onClick={() => setActiveTab?.('transactions')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
            >
              <span>{lang === 'ru' ? 'Все' : 'All'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-col divide-y divide-[#30363d]/50 mt-1 flex-1 justify-center">
            {filteredTxs.slice(0, 4).map((tx: any) => {
              const catMeta = getCategoryMeta(categories, tx.categoryId, t);
              const isIncome = tx.type === 'income';
              return (
                <div key={tx.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="text-neutral-200 font-medium truncate">{tx.note || catMeta.name}</span>
                  </div>
                  <span className={`font-mono font-semibold shrink-0 ${isIncome ? 'text-emerald-400' : 'text-neutral-200'}`}>
                    {isIncome ? '+' : '-'}{formatMoney(tx.amount, currency, lang)}
                  </span>
                </div>
              );
            })}
            {filteredTxs.length === 0 && (
              <div className="py-4 text-center text-xs text-neutral-400 italic">
                {lang === 'ru' ? 'Нет операций за выбранный период' : 'No transactions in period'}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 4. Goals Progress Summary */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {/* Goals Progress Summary */}
        <section className={`${tokens.components.card} p-5 flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className={tokens.typography.cardTitle}>{t('goals_progress_summary')}</h3>
              <p className={tokens.typography.secondary}>{goalData.length > 0 ? `${goalData.length} ${lang === 'ru' ? 'активных целей' : 'active goals'}` : (lang === 'ru' ? 'Целевые накопления' : 'Target savings')}</p>
            </div>
            <button 
              onClick={() => setActiveTab?.('purchases')}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium flex items-center gap-1"
            >
              <span>{lang === 'ru' ? 'Все цели' : 'All goals'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {goalData.length > 0 ? (
            <div className="flex flex-col gap-3.5 mt-1">
              {goalData.slice(0, 4).map((g, idx) => {
                const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
                return (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-200 font-medium truncate max-w-[180px]">{g.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400 font-semibold font-mono">{formatMoney(g.saved, currency, lang)}</span>
                        <span className="text-neutral-400 font-mono">/ {formatMoney(g.target, currency, lang)}</span>
                        <span className="text-xs text-neutral-400 font-bold ml-1 font-mono">({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-[#0d1117] h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center text-neutral-400 gap-2">
              <PiggyBank className="w-8 h-8 text-neutral-500" />
              <p className="text-xs text-neutral-400">{lang === 'ru' ? 'У вас пока нет активных целей накопления' : 'No active financial goals yet'}</p>
              <button 
                onClick={() => setActiveTab?.('purchases')}
                className="mt-1 px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/40 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'ru' ? 'Создать цель' : 'Add a goal'}</span>
              </button>
            </div>
          )}
        </section>
      </div>

      {/* 5. Enhanced Smart Pie & Bar Charts for Expenses and Incomes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Expenses by Category */}
        <SmartPieChart 
          title={t('expenses_by_cat') || (lang === 'ru' ? 'Расходы по категориям' : 'Expenses by Category')}
          subtitle={periodTitleLabel}
          data={expenseByCategory}
          totalAmount={totalActualExpensesPeriod}
          currency={currency}
          lang={lang}
          type="expense"
          emptyIcon={ShoppingBag}
          emptyMessage={lang === 'ru' ? `За период «${periodTitleLabel}» расходов не найдено.` : `No expenses found for ${periodTitleLabel}.`}
          t={t}
        />

        {/* Income Structure */}
        <SmartPieChart 
          title={t('income_by_cat') || (lang === 'ru' ? 'Источники доходов' : 'Income Sources')}
          subtitle={`${periodTitleLabel} • ${lang === 'ru' ? 'Зарплата, переводы, вклады' : 'Salary, transfers & yields'}`}
          data={incomeByCategory}
          totalAmount={totalEffectiveIncome}
          currency={currency}
          lang={lang}
          type="income"
          emptyIcon={Briefcase}
          emptyMessage={lang === 'ru' ? `За период «${periodTitleLabel}» доходов не найдено.` : `No income recorded for ${periodTitleLabel}.`}
          t={t}
        />

      </div>

      {/* 6. Comprehensive Financial Trends Suite */}
      <FinancialTrends 
        accounts={accounts}
        transactions={transactions}
        categories={categories}
        salary={salary}
        totalMonthlyInterest={totalMonthlyInterest}
        totalDebts={totalDebts}
        netWorth={netWorth}
        totalCreditDebt={totalCreditDebt}
        periodType={periodType}
        periodStartDate={periodStartDate}
        periodEndDate={periodEndDate}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        t={t}
        currency={currency}
        lang={lang}
      />

      {/* 7. Accounts Distribution & Capital Structure Bridge */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {accountBalances.length > 0 && (
          <SmartPieChart 
            title={t('accounts_dist') || (lang === 'ru' ? 'Распределение капитала' : 'Capital Distribution')}
            subtitle={`${accountBalances.length} ${lang === 'ru' ? 'реальных счетов' : 'real money accounts'}`}
            data={accountBalances}
            totalAmount={totalAssets}
            currency={currency}
            lang={lang}
            type="balance"
            emptyIcon={Wallet}
            emptyMessage={lang === 'ru' ? 'Нет счетов с положительным балансом.' : 'No accounts with positive balance.'}
            t={t}
          />
        )}

        {/* Dedicated Capital Structure Card */}
        <section className={`${tokens.components.card} p-5 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className={tokens.typography.cardTitle}>
                {lang === 'ru' ? 'Структура капитала' : 'Capital Structure'}
              </h3>
              <span className={`${tokens.components.badgeBase} ${tokens.colors.income.badge}`}>
                {lang === 'ru' ? 'Настоящие деньги' : 'Real Money'}
              </span>
            </div>
            <p className={`${tokens.typography.secondary} leading-relaxed`}>
              {lang === 'ru' 
                ? 'В капитал входят только настоящие деньги, имеющиеся на текущий момент (дебетовые карты, вклады, накопительные счета и наличные). Кредитные карты и кредиты не учитываются.' 
                : 'Capital strictly includes only real money currently available (checking, savings, deposits, cash, crypto). Credit cards and debts are not included.'}
            </p>
          </div>

          <div className="flex flex-col gap-2.5 my-4 bg-[#0d1117] p-4 rounded-xl border border-[#30363d]/70 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-300 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{lang === 'ru' ? 'Настоящие деньги на счетах:' : 'Real money on accounts:'}</span>
              </span>
              <span className="font-semibold font-mono text-emerald-400">+{formatMoney(totalAssets, currency, lang)}</span>
            </div>
            
            {totalCreditDebt + totalDebts > 0 && (
              <div className="flex items-center justify-between text-neutral-400">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-neutral-500" />
                  <span>{lang === 'ru' ? 'Кредиты и кредитки (не влияют на капитал):' : 'Credits & loans (do not affect capital):'}</span>
                </span>
                <span className="font-mono text-neutral-400">
                  {formatMoney(totalCreditDebt + totalDebts, currency, lang)}
                </span>
              </div>
            )}

            <div className="h-px w-full bg-[#30363d]/70 my-1" />

            <div className="flex items-center justify-between text-sm font-medium">
              <span className="text-neutral-200">{lang === 'ru' ? 'Итоговый капитал:' : 'Total Capital:'}</span>
              <span className={`${tokens.typography.kpiSecondary} text-emerald-400`}>
                {formatMoney(totalAssets, currency, lang)}
              </span>
            </div>

            {totalPurchasesAmount > 0 && (
              <div className="flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-[#30363d]/40">
                <span>{lang === 'ru' ? 'Резерв под запланированные покупки:' : 'Reserved for planned purchases:'}</span>
                <span className="font-mono text-amber-400 font-semibold">-{formatMoney(totalPurchasesAmount, currency, lang)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-neutral-400">
              {accountBalances.length} {lang === 'ru' ? 'счетов с реальными деньгами' : 'real money accounts'}
            </span>
            <button 
              onClick={() => setActiveTab?.('accounts')}
              className="px-3 py-1.5 bg-[#0d1117] hover:bg-[#1f242c] border border-[#30363d] rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors flex items-center gap-1.5"
            >
              <span>{lang === 'ru' ? 'Управление счетами' : 'Manage Accounts'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </div>

    </div>
  );
}

function PurchaseForm({ 
  isNew, name, setName, amount, setAmount,
  cancel, handleSubmit, onRemove, t 
}: any) {
  return (
    <Modal title={isNew ? t('add_purchase') : t('edit_purchase')} onClose={cancel}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <input 
            autoFocus
            type="text" 
            placeholder={t('goal_name')} 
            value={name} 
            onChange={e => setName(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 w-full text-neutral-200"
          />
          <input 
            type="number" 
            step="0.01"
            placeholder={t('amount')} 
            value={amount} 
            onChange={e => setAmount(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 w-full text-neutral-200"
          />
        </div>
        <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-[#30363d]/50">
          {!isNew && (
            <button type="button" onClick={onRemove} className="px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors mr-auto flex items-center gap-1.5"><Trash2 className="w-4 h-4"/> {t('cancel') === 'Cancel' ? 'Delete' : 'Удалить'}</button>
          )}
          <button type="button" onClick={cancel} className="px-4 py-2.5 text-sm font-medium text-neutral-400 hover:text-white bg-[#0d1117] border border-[#30363d] rounded-xl transition-colors">{t('cancel')}</button>
          <button type="submit" className="px-4 py-2.5 text-sm font-medium bg-emerald-500 text-neutral-950 rounded-xl hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">{t('save')}</button>
        </div>
      </form>
    </Modal>
  )
}

function PurchaseManager({ purchases, onAdd, onEdit, onRemove, t, currency, lang }: any) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  const startAdding = () => {
    setEditingId('new');
    setName('');
    setAmount('');
  };

  const startEditing = (p: any) => {
    setEditingId(p.id);
    setName(p.name);
    setAmount(p.amount.toString());
  };

  const cancel = () => {
    setEditingId(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    
    const purchaseData = { 
      name, 
      amount: parseFloat(amount)
    };

    if (editingId === 'new') {
      onAdd(purchaseData);
    } else if (editingId) {
      onEdit(editingId, purchaseData);
    }
    setEditingId(null);
  };

  return (
    <section className="flex flex-col bg-[#161b22] border border-[#30363d] rounded-xl p-3 sm:p-4 gap-3 shrink-0">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#0d1117] rounded-lg text-emerald-500 border border-[#30363d]">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-medium text-white">{t('purchases_title')}</h2>
        </div>
        <button 
          onClick={() => editingId === 'new' ? cancel() : startAdding()}
          className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
        >
          {editingId === 'new' ? t('cancel') : <><Plus className="w-3.5 h-3.5" /> {t('add_purchase')}</>}
        </button>
      </div>

      <AnimatePresence>
        {editingId !== null && (
          <PurchaseForm 
            key="form"
            isNew={editingId === 'new'}
            name={name} setName={setName}
            amount={amount} setAmount={setAmount}
            cancel={cancel} handleSubmit={handleSubmit} 
            onRemove={() => { if (editingId !== 'new') onRemove(editingId); cancel(); }} 
            t={t}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-0 overflow-y-auto compact-scrollbar pr-1 max-h-[300px]">
        <AnimatePresence mode="popLayout">
          {purchases.length === 0 && (
            <div className="text-neutral-500 italic text-xs text-center py-4">{t('no_purchases')}</div>
          )}
          
          {purchases.map((purchase: any) => (
               <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={purchase.id} 
                className="flex items-center justify-between py-2 px-3 border-b border-[#30363d]/50 hover:bg-[#30363d]/20 group transition-all cursor-pointer relative overflow-hidden"
                onClick={() => startEditing(purchase)}
              >
                <h4 className="font-medium text-sm text-neutral-200 leading-tight">
                  {purchase.name}
                </h4>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm text-neutral-300">
                    {formatMoney(purchase.amount, currency, lang)}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); startEditing(purchase); }} 
                    className="text-neutral-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all z-10 bg-[#0d1117] border border-[#30363d] rounded-md p-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

function GoalForm({ 
  isNew, name, setName, targetAmount, setTargetAmount, monthlyContribution, setMonthlyContribution, savedAmount, setSavedAmount,
  cancel, handleSubmit, onRemove, t 
}: any) {
  return (
    <Modal title={isNew ? t('add_goal') : t('edit_goal')} onClose={cancel}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input 
          autoFocus
          type="text" 
          placeholder={t('goal_name')} 
          value={name} 
          onChange={e => setName(e.target.value)}
          className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 w-full text-neutral-200"
        />
        <div className="grid grid-cols-2 gap-3">
          <input 
            type="number" 
            step="0.01"
            placeholder={t('target_amount')} 
            value={targetAmount} 
            onChange={e => setTargetAmount(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 w-full text-neutral-200"
          />
          <input 
            type="number" 
            step="0.01"
            placeholder={t('saved_amount')} 
            value={savedAmount} 
            onChange={e => setSavedAmount(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 w-full text-neutral-200"
          />
        </div>
        <input 
          type="number" 
          step="0.01"
          placeholder={t('monthly_contribution')} 
          value={monthlyContribution} 
          onChange={e => setMonthlyContribution(e.target.value)}
          className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 w-full text-neutral-200"
        />
        <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-[#30363d]/50">
          {!isNew && (
            <button type="button" onClick={onRemove} className="px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors mr-auto flex items-center gap-1.5"><Trash2 className="w-4 h-4"/> {t('cancel') === 'Cancel' ? 'Delete' : 'Удалить'}</button>
          )}
          <button type="button" onClick={cancel} className="px-4 py-2.5 text-sm font-medium text-neutral-400 hover:text-white bg-[#0d1117] border border-[#30363d] rounded-xl transition-colors">{t('cancel')}</button>
          <button type="submit" className="px-4 py-2.5 text-sm font-medium bg-emerald-500 text-neutral-950 rounded-xl hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">{t('save_goal')}</button>
        </div>
      </form>
    </Modal>
  )
}

function GoalManager({ goals, onAdd, onEdit, onRemove, t, currency, lang, freeCash }: any) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [calcId, setCalcId] = useState<string | null>(null);
  const [calcAmount, setCalcAmount] = useState('');
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [savedAmount, setSavedAmount] = useState('');

  const startAdding = () => {
    setEditingId('new');
    setName('');
    setTargetAmount('');
    setMonthlyContribution('');
    setSavedAmount('');
  };

  const startEditing = (g: Goal) => {
    setEditingId(g.id);
    setName(g.name);
    setTargetAmount(g.targetAmount.toString());
    setMonthlyContribution(g.monthlyContribution.toString());
    setSavedAmount(g.savedAmount.toString());
  };

  const cancel = () => {
    setEditingId(null);
    setCalcId(null);
  };

  const startCalc = (acc: Account, e: any) => {
    e.stopPropagation();
    if (editingId) setEditingId(null);
    setCalcId(acc.id);
    setCalcAmount('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount || !monthlyContribution) return;
    
    const goalData = { 
      name, 
      targetAmount: parseFloat(targetAmount), 
      monthlyContribution: parseFloat(monthlyContribution),
      savedAmount: parseFloat(savedAmount) || 0
    };

    if (editingId === 'new') {
      onAdd(goalData);
    } else if (editingId) {
      onEdit(editingId, goalData);
    }
    setEditingId(null);
  };

  return (
    <section className="flex flex-col bg-[#161b22] border border-[#30363d] rounded-xl p-3 sm:p-4 gap-3 shrink-0">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#0d1117] rounded-lg text-emerald-500 border border-[#30363d]">
            <Target className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-medium text-white">{t('goals_title')}</h2>
        </div>
        <button 
          onClick={() => editingId === 'new' ? cancel() : startAdding()}
          className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
        >
          {editingId === 'new' ? t('cancel') : <><Plus className="w-3.5 h-3.5" /> {t('add_goal')}</>}
        </button>
      </div>

      <AnimatePresence>
        {editingId !== null && (
          <GoalForm 
            key="form"
            isNew={editingId === 'new'}
            name={name} setName={setName}
            targetAmount={targetAmount} setTargetAmount={setTargetAmount}
            monthlyContribution={monthlyContribution} setMonthlyContribution={setMonthlyContribution}
            savedAmount={savedAmount} setSavedAmount={setSavedAmount}
            cancel={cancel} handleSubmit={handleSubmit} 
            onRemove={() => { if (editingId !== 'new') onRemove(editingId); cancel(); }} 
            t={t}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-0 overflow-y-auto compact-scrollbar pr-1 max-h-[300px]">
        <AnimatePresence mode="popLayout">
          {goals.length === 0 && (
            <div className="text-neutral-500 italic text-xs text-center py-4">{t('no_goals')}</div>
          )}
          
          {goals.map((goal: Goal) => {
            const isReached = goal.savedAmount >= goal.targetAmount;
            const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
            const monthsToReach = goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : 0;
            const progress = Math.min(100, Math.max(0, (goal.savedAmount / goal.targetAmount) * 100));

            return (
               <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={goal.id} 
                className="flex items-center justify-between py-2 px-3 border-b border-[#30363d]/50 hover:bg-[#30363d]/20 group transition-all cursor-pointer relative"
                onClick={() => startEditing(goal)}
              >
                <div>
                  <h4 className="font-medium text-sm text-neutral-200 leading-tight">
                    {goal.name}
                  </h4>
                  <div className="flex flex-col gap-1 mt-0.5">
                     <span className="text-[10px] text-neutral-500 leading-tight">
                       {isReached ? t('goal_reached') : t('goal_reach').replace('{{months}}', monthsToReach.toString())}
                     </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-16 sm:w-24 h-1 bg-[#0d1117] rounded-full overflow-hidden shadow-inner hidden sm:block">
                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="font-semibold text-sm text-neutral-300 tabular-nums">
                    {formatMoney(goal.savedAmount, currency, lang)}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); startEditing(goal); }} 
                    className="text-neutral-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all z-10 bg-[#0d1117] border border-[#30363d] rounded-md p-1.5 hidden sm:block"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}

function PaymentNotifications({ payments, accounts, t, currency, lang }: any) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getNextDueDate = (p: Payment): Date | null => {
    if (!p.date || p.isFlexible || !p.isActive) return null;
    const initialDate = new Date(p.date + 'T00:00:00');
    initialDate.setHours(0, 0, 0, 0);

    if (!p.recurrence || p.recurrence === 'none') {
      return initialDate >= today ? initialDate : null;
    }

    let nextDate = new Date(initialDate);
    while (nextDate < today) {
      if (p.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
      else if (p.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      else if (p.recurrence === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
    return nextDate;
  };

  const notifications = payments.reduce((acc: any[], p: Payment) => {
    const nextDate = getNextDueDate(p);
    if (!nextDate) return acc;
    
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 2 && diffDays >= 0) {
      const account = accounts.find((a: any) => a.id === p.accountId);
      acc.push({ payment: p, account, dueDate: nextDate, diffDays });
    }
    return acc;
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {notifications.map((n: any, idx: number) => (
        <div key={idx} className="bg-amber-950/40 border border-amber-900/50 rounded-2xl p-4 flex items-start gap-4 shadow-lg shadow-amber-900/10">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-full mt-0.5">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-amber-200">
              {n.diffDays === 0 ? t('payment_due_today') || 'Payment due today' : 
               n.diffDays === 1 ? t('payment_due_tomorrow') || 'Payment due tomorrow' : 
               t('payment_due_soon')}
            </h4>
            <p className="text-sm text-amber-400/80 mt-1">
              <strong className="text-amber-300">{n.payment.name}</strong> • {formatMoney(n.payment.amount, currency, lang)} 
              {n.account ? ` ${t('from_account')} ${n.account.name}` : ` (${t('no_account')})`}
            </p>
          </div>

        </div>
      ))}
    </div>
  );
}

function DashboardCard({ 
  title, 
  amount, 
  icon, 
  isNegative = false, 
  isHighlight = false, 
  subtitle, 
  currency, 
  lang,
  isClickable = false,
  onClick,
  isDetailOpen = false,
  detailsContent,
  badge
}: any) {
  return (
    <div 
      onClick={isClickable ? onClick : undefined}
      className={`${tokens.components.card} p-4 sm:p-5 flex flex-col justify-between gap-2 min-w-0 transition-all ${
        isClickable ? 'cursor-pointer hover:border-emerald-500/40 hover:bg-[#161b22]/95' : 'hover:border-[#30363d]/80'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 text-neutral-300 p-1.5 bg-[#0d1117] rounded-lg border border-[#30363d]/60">{icon}</div>
          <h3 className="font-semibold text-xs text-neutral-300 uppercase tracking-wider leading-snug truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span className={`${tokens.components.badgeBase} ${tokens.colors.neutral.badge}`}>
              {badge}
            </span>
          )}
          {isClickable && (
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#0d1117] border border-[#30363d] text-neutral-300 hover:text-white transition-colors flex items-center gap-1 font-medium">
              <span>{isDetailOpen ? (lang === 'ru' ? 'Скрыть' : 'Hide') : (lang === 'ru' ? 'Детали' : 'Details')}</span>
              <span className={`transform transition-transform text-xs ${isDetailOpen ? 'rotate-180' : ''}`}>▼</span>
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col mt-2">
        <div className={`${tokens.typography.kpiPrimary} leading-tight whitespace-nowrap overflow-visible ${isHighlight ? (isNegative ? tokens.colors.expense.text : tokens.colors.income.text) : 'text-white'}`}>
          {formatMoney(amount, currency, lang)}
        </div>
        {subtitle && <span className={`${tokens.typography.secondary} mt-1.5 leading-snug truncate`}>{subtitle}</span>}
      </div>
      {isDetailOpen && detailsContent && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e: any) => e.stopPropagation()}
        >
          {detailsContent}
        </motion.div>
      )}
    </div>
  );
}




export const BANKS = [
  { id: 'none', name: 'Other / Cash', icon: Landmark, color: 'text-neutral-400', bg: 'bg-[#0d1117]' },
  { id: 'chase', name: 'Chase', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'bofa', name: 'Bank of America', icon: Building2, color: 'text-red-500', bg: 'bg-red-500/10' },
  { id: 'wellsfargo', name: 'Wells Fargo', icon: Building2, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { id: 'sberbank', name: 'Sberbank', icon: Landmark, color: 'text-green-500', bg: 'bg-green-500/10' },
  { id: 'tinkoff', name: 'T-Bank', icon: Landmark, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { id: 'alfa', name: 'Alfa-Bank', icon: Landmark, color: 'text-red-600', bg: 'bg-red-600/10' },
  { id: 'revolut', name: 'Revolut', icon: Building2, color: 'text-white', bg: 'bg-white/10' }
];

function AccountForm({ 
  isNew, name, setName, balance, setBalance, type, setType, interestRate, setInterestRate, 
  creditLimit, setCreditLimit, gracePeriodDays, setGracePeriodDays,
  bank, setBank, cancel, handleSubmit, onRemove, t, currency, lang 
}: any) {
  const [showBankSelector, setShowBankSelector] = React.useState(false);
  const selectedBankInfo = FULL_BANKS.find(b => b.id === bank);

  const numBalance = parseFloat(balance) || 0;
  const numLimit = parseFloat(creditLimit) || 0;
  const numRate = parseFloat(interestRate) || 0;

  // Real-time calculations for credit cards
  const creditDebt = type === 'credit' ? Math.max(0, (numLimit || numBalance) - numBalance) : 0;
  const creditUsagePct = numLimit > 0 ? Math.min(100, Math.round((creditDebt / numLimit) * 100)) : 0;

  // Real-time calculations for yields
  const monthlyYield = (type === 'deposit' || type === 'savings' || numRate > 0) && numRate > 0 ? (numBalance * (numRate / 100)) / 12 : 0;

  const handleSelectType = (selectedType: AccountType) => {
    setType(selectedType);
    const isDefaultName = !name || 
      name === 'Дебетовая карта' || name === 'Накопительный счёт' || name === 'Вклад' || name === 'Наличные' || 
      name === 'Кредитная карта' || name === 'Debit Card' || name === 'Savings' || name === 'Deposit' || name === 'Cash';
      
    if (isDefaultName) {
      if (selectedType === 'checking') setName(lang === 'ru' ? 'Дебетовая карта' : 'Debit Card');
      else if (selectedType === 'savings') setName(lang === 'ru' ? 'Накопительный счёт' : 'Savings Account');
      else if (selectedType === 'deposit') setName(lang === 'ru' ? 'Вклад' : 'Term Deposit');
      else if (selectedType === 'cash') {
        setName(lang === 'ru' ? 'Наличные' : 'Cash');
        setBank('none');
      }
      else if (selectedType === 'credit') setName(lang === 'ru' ? 'Кредитная карта' : 'Credit Card');
      else if (selectedType === 'debt') setName(lang === 'ru' ? 'Кредит / Займ' : 'Loan');
    }
  };

  return (
    <Modal title={isNew ? (lang === 'ru' ? 'Добавить банковский продукт' : t('add_acc')) : (lang === 'ru' ? 'Редактировать продукт' : t('edit_acc'))} onClose={cancel}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {/* Quick Product Type Selector */}
        <div>
          <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
            {lang === 'ru' ? 'Тип продукта' : 'Product Type'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleSelectType('checking')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all text-xs font-medium ${
                type === 'checking'
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 shadow-sm'
                  : 'bg-[#0d1117] border-[#30363d] text-neutral-400 hover:border-neutral-500 hover:text-neutral-200'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>{lang === 'ru' ? 'Карта' : 'Card'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectType('savings')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all text-xs font-medium ${
                type === 'savings'
                  ? 'bg-blue-500/15 border-blue-500/60 text-blue-300 shadow-sm'
                  : 'bg-[#0d1117] border-[#30363d] text-neutral-400 hover:border-neutral-500 hover:text-neutral-200'
              }`}
            >
              <PiggyBank className="w-4 h-4" />
              <span>{lang === 'ru' ? 'Накопительный' : 'Savings'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectType('deposit')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all text-xs font-medium ${
                type === 'deposit'
                  ? 'bg-teal-500/15 border-teal-500/60 text-teal-300 shadow-sm'
                  : 'bg-[#0d1117] border-[#30363d] text-neutral-400 hover:border-neutral-500 hover:text-neutral-200'
              }`}
            >
              <Landmark className="w-4 h-4" />
              <span>{lang === 'ru' ? 'Вклад' : 'Deposit'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectType('cash')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all text-xs font-medium ${
                type === 'cash'
                  ? 'bg-green-500/15 border-green-500/60 text-green-300 shadow-sm'
                  : 'bg-[#0d1117] border-[#30363d] text-neutral-400 hover:border-neutral-500 hover:text-neutral-200'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>{lang === 'ru' ? 'Наличные' : 'Cash'}</span>
            </button>
          </div>

          {/* Secondary Types: Credit & Loan */}
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => handleSelectType('credit')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                type === 'credit' 
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300' 
                  : 'bg-[#0d1117] border-[#30363d]/60 text-neutral-400 hover:text-neutral-300'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'ru' ? 'Кредитная карта' : 'Credit Card'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectType('debt')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                type === 'debt' 
                  ? 'bg-red-500/15 border-red-500/50 text-red-300' 
                  : 'bg-[#0d1117] border-[#30363d]/60 text-neutral-400 hover:text-neutral-300'
              }`}
            >
              <Handshake className="w-3.5 h-3.5 text-red-400" />
              <span>{lang === 'ru' ? 'Кредит / Займ' : 'Loan / Debt'}</span>
            </button>
          </div>
        </div>

        {/* Bank Selector */}
        {type !== 'cash' && (
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
              {lang === 'ru' ? 'Банк' : 'Bank'}
            </label>
            <button 
              type="button" 
              onClick={() => setShowBankSelector(true)}
              className="w-full flex items-center justify-between bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 hover:border-neutral-500 transition-colors"
            >
              <div className="flex items-center gap-3">
                {selectedBankInfo ? (
                  <>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${selectedBankInfo.bg} ${selectedBankInfo.color}`}>
                      {selectedBankInfo.logo ? <selectedBankInfo.logo className="w-4 h-4"/> : selectedBankInfo.icon}
                    </div>
                    <span className="text-neutral-200 font-medium text-sm">{selectedBankInfo.name}</span>
                  </>
                ) : (
                  <span className="text-neutral-500 text-sm">{lang === 'ru' ? 'Выберите банк' : 'Select bank'}</span>
                )}
              </div>
              <span className="text-neutral-400 text-xs font-medium">{lang === 'ru' ? 'Изменить' : 'Change'}</span>
            </button>
          </div>
        )}
        
        {showBankSelector && (
          <BankSelectorModal onSelect={setBank} onClose={() => setShowBankSelector(false)} />
        )}

        {/* Product / Account Name */}
        <div>
          <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
            {lang === 'ru' ? 'Название продукта' : 'Product Name'}
          </label>
          <input 
            type="text" 
            placeholder={
              type === 'savings' ? (lang === 'ru' ? 'Накопительный счёт' : 'Savings Account') :
              type === 'deposit' ? (lang === 'ru' ? 'Вклад' : 'Term Deposit') :
              type === 'cash' ? (lang === 'ru' ? 'Наличные' : 'Cash') :
              (lang === 'ru' ? 'Дебетовая карта' : 'Debit Card')
            }
            value={name} 
            onChange={e => setName(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 text-neutral-200 text-sm"
          />
        </div>

        {/* Dynamic Fields for Credit Card */}
        {type === 'credit' ? (
          <div className="flex flex-col gap-3 p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  {lang === 'ru' ? 'Доступный остаток' : 'Available Balance'}
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0"
                  value={balance} 
                  onChange={e => setBalance(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3.5 py-2 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 text-neutral-100 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  {lang === 'ru' ? 'Кредитный лимит (макс)' : 'Credit Limit (Max)'}
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="100000"
                  value={creditLimit} 
                  onChange={e => setCreditLimit(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3.5 py-2 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 text-neutral-100 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  {lang === 'ru' ? 'Льготный период (дней)' : 'Grace Period (days)'}
                </label>
                <input 
                  type="number" 
                  step="1"
                  placeholder="55, 100, 120"
                  value={gracePeriodDays} 
                  onChange={e => setGracePeriodDays(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3.5 py-2 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 text-neutral-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  {lang === 'ru' ? 'Ставка вне грейса (% годовых)' : 'Interest Rate (%)'}
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  placeholder="29.9"
                  value={interestRate} 
                  onChange={e => setInterestRate(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3.5 py-2 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 text-neutral-100 text-sm"
                />
              </div>
            </div>

            {/* Live Credit Card preview bar */}
            {numLimit > 0 && (
              <div className="pt-2 border-t border-[#30363d]/60 flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between items-center text-neutral-300">
                  <span>{lang === 'ru' ? 'Задолженность / Использовано:' : 'Current Debt:'}</span>
                  <span className={`font-semibold font-mono ${creditDebt > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {formatMoney(creditDebt, currency, lang)} ({creditUsagePct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      creditUsagePct > 70 ? 'bg-red-500' : creditUsagePct > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, creditUsagePct)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
                {type === 'debt' ? (lang === 'ru' ? 'Остаток долга' : 'Remaining Debt') : t('acc_balance')}
              </label>
              <input 
                type="number" 
                step="0.01"
                placeholder="0"
                value={balance} 
                onChange={e => setBalance(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 text-neutral-200 text-sm font-mono"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  {lang === 'ru' ? 'Ставка (% годовых)' : 'Interest Rate (%)'}
                </label>
                {(type === 'savings' || type === 'deposit') && (
                  <span className="text-[10px] text-emerald-400 font-medium">
                    {lang === 'ru' ? 'рекомендуется' : 'recommended'}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder={type === 'savings' ? '13' : type === 'deposit' ? '14' : '0.0'}
                  value={interestRate}
                  onChange={e => setInterestRate(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 text-neutral-200 text-sm pl-9"
                />
                <Percent className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        )}

        {/* Live Yield Hint */}
        {numRate > 0 && type !== 'credit' && type !== 'debt' && (
          <div className="p-2.5 bg-emerald-950/25 border border-emerald-900/50 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {lang === 'ru' ? `Будет показано: «${numRate}% годовых»` : `Will show badge: «${numRate}% APY»`}
            </span>
            {monthlyYield > 0 && (
              <span className="font-semibold font-mono text-emerald-400">
                +{formatMoney(monthlyYield, currency, lang)}/{lang === 'ru' ? 'мес' : 'mo'}
              </span>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-[#30363d]/50">
          {!isNew && (
            <button type="button" onClick={onRemove} className="px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors mr-auto flex items-center gap-1.5">
              <Trash2 className="w-4 h-4"/> {t('cancel') === 'Cancel' ? 'Delete' : 'Удалить'}
            </button>
          )}
          <button type="button" onClick={cancel} className="px-4 py-2.5 text-sm font-medium text-neutral-400 hover:text-white bg-[#0d1117] border border-[#30363d] rounded-xl transition-colors">
            {t('cancel')}
          </button>
          <button type="submit" className="px-4 py-2.5 text-sm font-medium bg-emerald-500 text-neutral-950 rounded-xl hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            {t('save_acc')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AccountManager({ accounts, onAdd, onEdit, onRemove, onOpenReset, salary, setSalary, t, currency, lang }: any) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [calcId, setCalcId] = useState<string | null>(null);
  const [calcAmount, setCalcAmount] = useState('');
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [interestRate, setInterestRate] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [gracePeriodDays, setGracePeriodDays] = useState('');
  const [bank, setBank] = useState<string>('none');
  const [groupingMode, setGroupingMode] = useState<'bank' | 'category'>('bank');

  const startAdding = (defaultType: AccountType = 'checking') => {
    setEditingId('new');
    if (defaultType === 'savings') {
      setName(lang === 'ru' ? 'Накопительный счёт' : 'Savings Account');
      setInterestRate('13');
    } else if (defaultType === 'deposit') {
      setName(lang === 'ru' ? 'Вклад' : 'Term Deposit');
      setInterestRate('14');
    } else if (defaultType === 'cash') {
      setName(lang === 'ru' ? 'Наличные' : 'Cash');
      setInterestRate('');
    } else if (defaultType === 'credit') {
      setName(lang === 'ru' ? 'Кредитная карта' : 'Credit Card');
      setInterestRate('');
    } else {
      setName(lang === 'ru' ? 'Дебетовая карта' : 'Debit Card');
      setInterestRate('');
    }
    setBalance('');
    setType(defaultType);
    setCreditLimit('');
    setGracePeriodDays('');
    setBank(defaultType === 'cash' ? 'none' : 'yandex');
  };

  const startEditing = (acc: Account) => {
    setEditingId(acc.id);
    setName(acc.name);
    setBalance(acc.balance.toString());
    setType(acc.type || 'checking');
    setInterestRate(acc.interestRate?.toString() || '');
    setCreditLimit(acc.creditLimit?.toString() || '');
    setGracePeriodDays(acc.gracePeriodDays?.toString() || '');
    setBank(acc.bank || 'none');
  };

  const cancel = () => {
    setEditingId(null);
    setCalcId(null);
  };

  const startCalc = (acc: Account, e: any) => {
    e.stopPropagation();
    if (editingId) setEditingId(null);
    setCalcId(acc.id);
    setCalcAmount('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || balance === '') return;
    
    const parsedRate = interestRate ? parseFloat(interestRate) : undefined;
    const parsedLimit = (type === 'credit' && creditLimit) ? parseFloat(creditLimit) : undefined;
    const parsedGrace = (type === 'credit' && gracePeriodDays) ? parseInt(gracePeriodDays, 10) : undefined;

    const accountData = { 
      name, 
      balance: parseFloat(balance), 
      type, 
      interestRate: type !== 'cash' ? parsedRate : undefined,
      creditLimit: parsedLimit,
      gracePeriodDays: parsedGrace,
      bank: type === 'cash' ? 'none' : (bank || 'none')
    };

    if (editingId === 'new') {
      onAdd(accountData);
    } else if (editingId) {
      onEdit(editingId, accountData);
    }
    setEditingId(null);
  };

  // Helper: Seed demo products matching the user's mockup!
  const loadDemoProducts = () => {
    const demoAccounts: Omit<Account, 'id'>[] = [
      {
        name: lang === 'ru' ? 'Накопительный счёт' : 'Savings Account',
        balance: 87816,
        type: 'savings',
        interestRate: 13,
        bank: 'yandex'
      },
      {
        name: lang === 'ru' ? 'Вклад' : 'Term Deposit',
        balance: 1300000,
        type: 'deposit',
        interestRate: 14,
        bank: 'yandex'
      },
      {
        name: lang === 'ru' ? 'Дебетовая карта' : 'Debit Card',
        balance: 0,
        type: 'checking',
        bank: 'yandex'
      },
      {
        name: lang === 'ru' ? 'Т-Банк Black' : 'T-Bank Black',
        balance: 45200,
        type: 'checking',
        bank: 'tinkoff'
      },
      {
        name: lang === 'ru' ? 'Накопительный счёт Т' : 'T-Bank Savings',
        balance: 250000,
        type: 'savings',
        interestRate: 12,
        bank: 'tinkoff'
      },
      {
        name: lang === 'ru' ? 'Наличные в кошельке' : 'Cash in wallet',
        balance: 15000,
        type: 'cash',
        bank: 'none'
      }
    ];

    demoAccounts.forEach(acc => onAdd(acc));
  };

  // 1. Available Money (Доступные деньги): checking + cash accounts
  const availableAccounts = accounts.filter((a: Account) => a.type === 'checking' || a.type === 'cash' || !a.type);
  const totalAvailableFunds = availableAccounts.reduce((sum: number, a: Account) => sum + (a.balance > 0 ? a.balance : 0), 0);

  // 2. Savings & Deposits (Накопления): savings + deposit accounts
  const savingsAccounts = accounts.filter((a: Account) => a.type === 'savings' || a.type === 'deposit');
  const totalSavingsFunds = savingsAccounts.reduce((sum: number, a: Account) => sum + (a.balance > 0 ? a.balance : 0), 0);

  // 3. Monthly Interest Yield across all accounts
  const totalMonthlyYield = accounts.reduce((sum: number, a: Account) => {
    if (!a.interestRate || a.balance <= 0) return sum;
    return sum + (a.balance * (a.interestRate / 100)) / 12;
  }, 0);

  // 4. Weighted average savings rate
  const weightedRate = totalSavingsFunds > 0
    ? (savingsAccounts.reduce((sum: number, a: Account) => sum + (a.interestRate || 0) * Math.max(0, a.balance), 0) / totalSavingsFunds)
    : 0;

  // 5. Credit Cards & Debts
  const creditCards = accounts.filter((a: Account) => a.type === 'credit');
  const debtAccounts = accounts.filter((a: Account) => a.type === 'debt');
  const totalCreditLimit = creditCards.reduce((sum: number, a: Account) => sum + (a.creditLimit || a.balance), 0);
  const totalCreditAvailable = creditCards.reduce((sum: number, a: Account) => sum + a.balance, 0);
  const totalCreditDebt = creditCards.reduce((sum: number, a: Account) => sum + Math.max(0, (a.creditLimit || a.balance) - a.balance), 0);
  const totalDebts = debtAccounts.reduce((sum: number, a: Account) => sum + Math.abs(a.balance), 0);

  // Bank Logo Renderer matching screenshot branding
  const renderBankLogo = (bankId: string) => {
    if (bankId === 'yandex') {
      return (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-black bg-[#ffcc00] text-sm sm:text-base shrink-0 shadow-sm select-none">
          Я
        </div>
      );
    }
    if (bankId === 'tinkoff') {
      return (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-black bg-[#ffdd2d] text-sm sm:text-base shrink-0 shadow-sm select-none">
          T
        </div>
      );
    }
    if (bankId === 'sberbank') {
      return (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-white bg-[#21a038] text-sm shrink-0 shadow-sm select-none">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      );
    }
    if (bankId === 'alfa') {
      return (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-white bg-[#ef3124] text-sm sm:text-base shrink-0 shadow-sm select-none">
          A
        </div>
      );
    }
    if (bankId === 'ozon') {
      return (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-white bg-[#005bff] text-sm sm:text-base shrink-0 shadow-sm select-none">
          O
        </div>
      );
    }
    if (bankId === 'vtb') {
      return (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-white bg-[#0a2896] text-sm sm:text-base shrink-0 shadow-sm select-none">
          V
        </div>
      );
    }
    if (bankId === 'cash') {
      return (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-green-400 bg-green-500/10 border border-green-500/30 shrink-0">
          <Banknote className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      );
    }
    const b = FULL_BANKS.find(x => x.id === bankId);
    if (b) {
      return (
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${b.bg} ${b.color}`}>
          {b.logo ? <b.logo className="w-4 h-4 sm:w-5 sm:h-5"/> : b.icon}
        </div>
      );
    }
    return (
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-neutral-400 bg-[#0d1117] border border-[#30363d] shrink-0">
        <Landmark className="w-4 h-4" />
      </div>
    );
  };

  // Group accounts by Bank
  const bankGroups = React.useMemo(() => {
    const groups: Record<string, Account[]> = {};

    accounts.forEach((acc: Account) => {
      let bId = acc.bank;
      if (!bId || bId === 'none') {
        bId = acc.type === 'cash' ? 'cash' : 'none';
      }
      if (!groups[bId]) groups[bId] = [];
      groups[bId].push(acc);
    });

    return Object.entries(groups).map(([bankId, bankAccounts]) => {
      let bankName = lang === 'ru' ? 'Другие счета' : 'Other Accounts';
      if (bankId === 'cash') bankName = lang === 'ru' ? 'Наличные' : 'Cash';
      else {
        const info = FULL_BANKS.find(b => b.id === bankId);
        if (info) bankName = info.name;
      }

      const totalBalance = bankAccounts
        .filter(a => a.type !== 'debt')
        .reduce((sum, a) => sum + (a.balance > 0 ? a.balance : 0), 0);

      const totalYield = bankAccounts.reduce((sum, a) => {
        if (!a.interestRate || a.balance <= 0) return sum;
        return sum + (a.balance * (a.interestRate / 100)) / 12;
      }, 0);

      return {
        bankId,
        bankName,
        bankAccounts,
        totalBalance,
        totalYield
      };
    }).sort((a, b) => b.totalBalance - a.totalBalance);
  }, [accounts, lang]);

  // Product Type Metadata helper
  const getProductTypeMeta = (accType?: AccountType) => {
    switch (accType) {
      case 'savings':
        return {
          label: lang === 'ru' ? 'Накопительный' : 'Savings',
          style: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
        };
      case 'deposit':
        return {
          label: lang === 'ru' ? 'Вклад' : 'Deposit',
          style: 'bg-teal-500/10 text-teal-400 border-teal-500/30'
        };
      case 'cash':
        return {
          label: lang === 'ru' ? 'Наличные' : 'Cash',
          style: 'bg-green-500/10 text-green-400 border-green-500/30'
        };
      case 'credit':
        return {
          label: lang === 'ru' ? 'Карта (кредит)' : 'Credit Card',
          style: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        };
      case 'debt':
        return {
          label: lang === 'ru' ? 'Кредит' : 'Loan',
          style: 'bg-red-500/10 text-red-400 border-red-500/30'
        };
      case 'crypto':
        return {
          label: lang === 'ru' ? 'Крипто' : 'Crypto',
          style: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
        };
      case 'checking':
      default:
        return {
          label: lang === 'ru' ? 'Карта' : 'Card',
          style: 'bg-[#0d1117] text-neutral-300 border-[#30363d]'
        };
    }
  };

  // Render a Single Product Row (Clean, high-legibility, with interest rate badge)
  const renderProductRow = (acc: Account) => {
    const isCredit = acc.type === 'credit';
    const limit = acc.creditLimit || acc.balance;
    const debt = isCredit ? Math.max(0, limit - acc.balance) : 0;
    const monthlyYield = acc.interestRate && acc.balance > 0 ? (acc.balance * (acc.interestRate / 100)) / 12 : 0;
    const typeMeta = getProductTypeMeta(acc.type);

    return calcId === acc.id ? (
      <motion.div 
        key={`calc-${acc.id}`}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="flex flex-col gap-3 p-3.5 bg-emerald-950/20 border-b border-emerald-900/40 overflow-hidden"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5"/> {lang === 'ru' ? `Калькулятор доходности: ${acc.name}` : `Yield Calculator: ${acc.name}`}
          </h3>
          <button onClick={cancel} className="text-xs text-neutral-400 hover:text-white transition-colors">✕</button>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-neutral-400 whitespace-nowrap">{lang === 'ru' ? 'Пополнить на:' : 'Add funds:'}</span>
          <input 
            autoFocus
            type="number" 
            step="0.01"
            placeholder="100000"
            value={calcAmount} 
            onChange={e => setCalcAmount(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-neutral-200 outline-none focus:border-emerald-500/50 transition-colors w-full font-mono"
          />
        </div>
        {parseFloat(calcAmount) > 0 && acc.interestRate && (
          <div className="text-xs text-neutral-300">
            {lang === 'ru' ? 'Дополнительный доход' : 'Extra profit'}: <span className="font-semibold text-emerald-400 font-mono">+{formatMoney(((parseFloat(calcAmount) || 0) * (acc.interestRate / 100)) / 12, currency, lang)}</span> {lang === 'ru' ? '/ месяц' : '/ month'}.
          </div>
        )}
      </motion.div>
    ) : (
      <div 
        key={acc.id}
        onClick={() => startEditing(acc)}
        className="flex items-center justify-between p-3.5 sm:px-4 hover:bg-[#30363d]/25 transition-all cursor-pointer group"
      >
        <div className="flex flex-col gap-1.5 min-w-0 pr-3">
          <span className="font-semibold text-sm sm:text-base text-neutral-100 group-hover:text-emerald-400 transition-colors truncate">
            {acc.name}
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Interest Rate Badge (Distinctive Green Pill matching the user's mockup!) */}
            {acc.interestRate !== undefined && acc.interestRate !== null && acc.interestRate > 0 ? (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-mono shadow-sm flex items-center gap-1">
                {acc.interestRate}% {lang === 'ru' ? 'годовых' : 'APY'}
              </span>
            ) : null}

            {/* Product Type Badge: Карта, Накопительный, Вклад, Наличные */}
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${typeMeta.style}`}>
              {typeMeta.label}
            </span>

            {/* Credit Grace Days */}
            {isCredit && acc.gracePeriodDays && (
              <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {acc.gracePeriodDays} {lang === 'ru' ? 'дней грейс' : 'days grace'}
              </span>
            )}

            {/* Estimated monthly yield badge for deposits & savings */}
            {monthlyYield > 0 && (
              <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
                ~+{formatMoney(monthlyYield, currency, lang)}/{lang === 'ru' ? 'мес' : 'mo'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="font-bold text-sm sm:text-base font-mono text-neutral-100 block">
              {formatMoney(acc.balance, currency, lang)}
            </span>
            {isCredit && debt > 0 && (
              <span className="text-[10px] text-amber-400 font-mono block">
                {lang === 'ru' ? 'Долг:' : 'Debt:'} -{formatMoney(debt, currency, lang)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {acc.interestRate && (
              <button 
                onClick={(e) => startCalc(acc, e)} 
                className="text-neutral-400 hover:text-emerald-400 transition-all bg-[#0d1117] border border-[#30363d] rounded-md p-1.5"
                title={lang === 'ru' ? 'Калькулятор доходности' : 'Calculator'}
              >
                <Calculator className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="text-neutral-400 hover:text-white transition-colors p-1.5 bg-[#0d1117] rounded-md border border-[#30363d]">
              <Pencil className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="flex flex-col bg-[#161b22] border border-[#30363d] rounded-2xl p-4 sm:p-5 gap-4 shrink-0 shadow-sm">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#30363d]/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#0d1117] rounded-xl text-emerald-400 border border-[#30363d]">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              {lang === 'ru' ? 'Счета и накопления' : 'Accounts & Savings'}
            </h2>
            <p className="text-[11px] text-neutral-400">
              {lang === 'ru' ? 'Разделение доступных денег и накоплений по банкам' : 'Available funds and savings broken down by bank'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {accounts.length > 0 && onOpenReset && (
            <button 
              onClick={onOpenReset}
              className="text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors px-2.5 py-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] hover:border-neutral-500 flex items-center gap-1.5"
              title={lang === 'ru' ? 'Сбросить все счета и операции' : 'Reset accounts and transactions'}
            >
              <Trash2 className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden sm:inline text-[11px]">{lang === 'ru' ? 'Сброс' : 'Reset'}</span>
            </button>
          )}

          <button 
            onClick={() => editingId === 'new' ? cancel() : startAdding('savings')}
            className="text-xs font-semibold text-teal-300 hover:text-teal-200 transition-colors px-3 py-1.5 rounded-lg bg-teal-500/15 border border-teal-500/35 flex items-center gap-1.5"
          >
            <PiggyBank className="w-3.5 h-3.5 text-teal-400" />
            <span>{lang === 'ru' ? '+ Накопление / Вклад' : '+ Savings / Deposit'}</span>
          </button>

          <button 
            onClick={() => editingId === 'new' ? cancel() : startAdding('checking')}
            className="text-xs font-semibold text-neutral-950 bg-emerald-500 hover:bg-emerald-400 transition-colors px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
          >
            {editingId === 'new' ? t('cancel') : <><Plus className="w-3.5 h-3.5" /> {lang === 'ru' ? 'Добавить продукт' : t('add_acc')}</>}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VISUAL SEPARATION: Available Money (Доступные) vs Savings (Накопления) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Available Money Card */}
        <div className={`${tokens.components.card} p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 transition-colors`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                  {lang === 'ru' ? 'Доступные деньги' : 'Available Funds'}
                </span>
                <span className={`${tokens.typography.secondary} block mt-0.5`}>
                  {lang === 'ru' ? 'Дебетовые карты, расчетные счета и наличные' : 'Cards, checking & cash'}
                </span>
              </div>
            </div>
            <span className={`${tokens.components.badgeBase} ${tokens.colors.income.badge} whitespace-nowrap`}>
              {lang === 'ru' ? 'Для трат' : 'Daily spend'}
            </span>
          </div>

          <div className="mt-3.5 flex items-baseline justify-between">
            <span className={tokens.typography.kpiPrimary}>
              {formatMoney(totalAvailableFunds, currency, lang)}
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              {availableAccounts.length} {lang === 'ru' ? (availableAccounts.length === 1 ? 'счёт' : 'счетов') : 'accounts'}
            </span>
          </div>
        </div>

        {/* Savings & Deposits Card */}
        <div className={`${tokens.components.card} p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group hover:border-teal-500/40 transition-colors`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <PiggyBank className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                  {lang === 'ru' ? 'Накопления и вклады' : 'Savings & Deposits'}
                </span>
                <span className="text-xs text-teal-400 font-medium block mt-0.5">
                  {totalMonthlyYield > 0 
                    ? `+${formatMoney(totalMonthlyYield, currency, lang)}/${lang === 'ru' ? 'мес пассивный доход' : 'mo passive yield'}` 
                    : (lang === 'ru' ? 'Счета под процент' : 'Yielding capital')}
                </span>
              </div>
            </div>
            {weightedRate > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-teal-500/15 border border-teal-500/30 text-teal-300 font-bold font-mono whitespace-nowrap">
                ~{weightedRate.toFixed(1)}% {lang === 'ru' ? 'годовых' : 'APY'}
              </span>
            )}
          </div>

          <div className="mt-3.5 flex items-baseline justify-between">
            <span className={`${tokens.typography.kpiPrimary} text-teal-300`}>
              {formatMoney(totalSavingsFunds, currency, lang)}
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              {savingsAccounts.length} {lang === 'ru' ? (savingsAccounts.length === 1 ? 'продукт' : 'продукта') : 'products'}
            </span>
          </div>
        </div>
      </div>

      {/* Credit debt warning card if applicable */}
      {totalCreditDebt > 0 && (
        <div className="p-3.5 bg-amber-950/20 border border-amber-900/50 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span className="text-neutral-300">
              {lang === 'ru' ? 'Задолженность по кредитным картам:' : 'Credit card debt:'}
            </span>
            <span className="font-bold font-mono text-amber-400">
              -{formatMoney(totalCreditDebt, currency, lang)}
            </span>
          </div>
          <span className="text-xs text-neutral-400">
            {lang === 'ru' ? 'не вычитается из капитала' : 'separated from capital'}
          </span>
        </div>
      )}

      {/* View Mode Switcher: By Banks vs By Category */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1 p-1 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs">
          <button
            onClick={() => setGroupingMode('bank')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              groupingMode === 'bank' 
                ? 'bg-[#161b22] text-white font-semibold border border-[#30363d] shadow-sm' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-yellow-400" />
            <span>{lang === 'ru' ? 'По банкам' : 'By Banks'}</span>
          </button>
          <button
            onClick={() => setGroupingMode('category')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              groupingMode === 'category' 
                ? 'bg-[#161b22] text-white font-semibold border border-[#30363d] shadow-sm' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === 'ru' ? 'По типам' : 'By Type'}</span>
          </button>
        </div>

        {/* Monthly Salary Setting Bar (Compact) */}
        <div className="flex items-center gap-2 bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-1 text-xs">
          <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-neutral-400 hidden sm:inline">{lang === 'ru' ? 'Зарплата:' : 'Salary:'}</span>
          <div className="flex items-center">
            <input
              type="number"
              value={salary || ''}
              onChange={e => setSalary(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-20 bg-transparent text-xs font-bold font-mono text-emerald-400 outline-none text-right"
            />
            <span className="text-xs font-mono text-neutral-400 ml-1">{currency}</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editingId !== null && (
          <AccountForm 
            key="form"
            isNew={editingId === 'new'}
            name={name} setName={setName}
            balance={balance} setBalance={setBalance}
            type={type} setType={setType}
            interestRate={interestRate} setInterestRate={setInterestRate}
            creditLimit={creditLimit} setCreditLimit={setCreditLimit}
            gracePeriodDays={gracePeriodDays} setGracePeriodDays={setGracePeriodDays}
            bank={bank} setBank={setBank}
            cancel={cancel} handleSubmit={handleSubmit} 
            onRemove={() => { if (editingId !== 'new') onRemove(editingId); cancel(); }} 
            t={t}
            currency={currency}
            lang={lang}
          />
        )}
      </AnimatePresence>

      {/* Account Groups List */}
      <div className="flex flex-col gap-4 overflow-y-auto compact-scrollbar pr-1 max-h-[580px]">
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-[#0d1117]/60 border border-[#30363d]/60 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#161b22] border border-[#30363d] flex items-center justify-center text-emerald-400 mb-3 shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-200">
              {lang === 'ru' ? 'Нет добавленных продуктов' : 'No accounts or products yet'}
            </h3>
            <p className="text-xs text-neutral-400 max-w-sm mt-1">
              {lang === 'ru' 
                ? 'Добавьте дебетовую карту, накопительный счёт или вклад, либо загрузите пример структуры счетов.' 
                : 'Add a debit card, savings account or deposit, or load sample bank products.'}
            </p>
            <div className="flex items-center gap-3 mt-4 flex-wrap justify-center">
              <button 
                onClick={() => startAdding('checking')}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'ru' ? 'Добавить первый продукт' : 'Add First Product'}</span>
              </button>
              <button 
                onClick={loadDemoProducts}
                className="px-4 py-2 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-neutral-200 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>{lang === 'ru' ? 'Загрузить пример (Яндекс Банк, Т-Банк, Наличные)' : 'Load sample (Yandex Bank, T-Bank)'}</span>
              </button>
            </div>
          </div>
        ) : groupingMode === 'bank' ? (
          /* ========================================================================= */
          /* 2. GROUPED BY BANK (MATCHING THE USER'S ATTACHED SCREENSHOT MOCKUP!)      */
          /* ========================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {bankGroups.map(({ bankId, bankName, bankAccounts, totalBalance, totalYield }) => (
              <div 
                key={bankId} 
                className={`${tokens.components.card} flex flex-col justify-between`}
              >
                {/* Bank Card Header */}
                <div className="flex items-center justify-between p-3.5 sm:p-4 bg-[#161b22] border-b border-[#30363d]/60">
                  <div className="flex items-center gap-3">
                    {renderBankLogo(bankId)}
                    <div>
                      <h3 className={tokens.typography.cardTitle}>
                        {bankName}
                      </h3>
                      <span className={`${tokens.typography.secondary} mt-0.5 block`}>
                        {lang === 'ru' ? 'Банковские продукты' : 'Bank products'} • {bankAccounts.length} {lang === 'ru' ? (bankAccounts.length === 1 ? 'продукт' : 'продукта') : 'products'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`${tokens.typography.kpiSecondary} text-white block`}>
                      {formatMoney(totalBalance, currency, lang)}
                    </span>
                    {totalYield > 0 && (
                      <span className="text-xs text-emerald-400 font-mono block mt-0.5 font-medium">
                        +{formatMoney(totalYield, currency, lang)}/{lang === 'ru' ? 'мес' : 'mo'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bank Product Rows */}
                <div className="divide-y divide-[#30363d]/40 flex-1">
                  {bankAccounts.map(renderProductRow)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ========================================================================= */
          /* 3. GROUPED BY CATEGORY (Checking / Savings / Deposits / Cash / Debts)      */
          /* ========================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* 1. Debit Cards & Checking Accounts */}
            {availableAccounts.filter(a => a.type !== 'cash').length > 0 && (
              <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-[#161b22] border-b border-[#30363d]/60 text-xs font-semibold text-neutral-200">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'ru' ? '💳 Дебетовые карты и счета' : '💳 Debit Cards & Checking'}</span>
                  </div>
                  <span className="font-mono text-neutral-200">
                    {formatMoney(availableAccounts.filter(a => a.type !== 'cash').reduce((sum, a) => sum + a.balance, 0), currency, lang)}
                  </span>
                </div>
                <div className="divide-y divide-[#30363d]/40">
                  {availableAccounts.filter(a => a.type !== 'cash').map(renderProductRow)}
                </div>
              </div>
            )}

            {/* 2. Savings & Term Deposits */}
            {savingsAccounts.length > 0 && (
              <div className="bg-[#0d1117] border border-teal-500/30 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-[#161b22] border-b border-[#30363d]/60 text-xs font-semibold text-teal-300">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-teal-400" />
                    <span>{lang === 'ru' ? '🏦 Вклады и накопительные счета' : '🏦 Savings & Deposits'}</span>
                  </div>
                  <span className="font-mono text-teal-300">
                    {formatMoney(totalSavingsFunds, currency, lang)}
                  </span>
                </div>
                <div className="divide-y divide-[#30363d]/40">
                  {savingsAccounts.map(renderProductRow)}
                </div>
              </div>
            )}

            {/* 3. Cash */}
            {accounts.filter(a => a.type === 'cash').length > 0 && (
              <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-[#161b22] border-b border-[#30363d]/60 text-xs font-semibold text-green-300">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-green-400" />
                    <span>{lang === 'ru' ? '💵 Наличные' : '💵 Cash'}</span>
                  </div>
                  <span className="font-mono text-green-300">
                    {formatMoney(accounts.filter(a => a.type === 'cash').reduce((sum, a) => sum + a.balance, 0), currency, lang)}
                  </span>
                </div>
                <div className="divide-y divide-[#30363d]/40">
                  {accounts.filter(a => a.type === 'cash').map(renderProductRow)}
                </div>
              </div>
            )}

            {/* 4. Credit Cards */}
            {creditCards.length > 0 && (
              <div className="bg-[#0d1117] border border-amber-500/30 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-[#161b22] border-b border-[#30363d]/60 text-xs font-semibold text-amber-300">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span>{lang === 'ru' ? '💳 Кредитные карты' : '💳 Credit Cards'}</span>
                  </div>
                  <span className="font-mono text-amber-300">
                    {formatMoney(totalCreditAvailable, currency, lang)}
                  </span>
                </div>
                <div className="divide-y divide-[#30363d]/40">
                  {creditCards.map(renderProductRow)}
                </div>
              </div>
            )}

            {/* 5. Debts & Loans */}
            {debtAccounts.length > 0 && (
              <div className="bg-[#0d1117] border border-red-500/30 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-[#161b22] border-b border-[#30363d]/60 text-xs font-semibold text-red-300">
                  <div className="flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-red-400" />
                    <span>{lang === 'ru' ? '🤝 Кредиты и займы' : '🤝 Loans & Debts'}</span>
                  </div>
                  <span className="font-mono text-red-400">
                    -{formatMoney(totalDebts, currency, lang)}
                  </span>
                </div>
                <div className="divide-y divide-[#30363d]/40">
                  {debtAccounts.map(renderProductRow)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}


function PaymentForm({ 
  isNew, name, setName, amount, setAmount, date, setDate, recurrence, setRecurrence,
  isFlexible, setIsFlexible, accountId, setAccountId, accounts, cancel, handleSubmit, onRemove, t 
}: any) {
  return (
    <Modal title={isNew ? t('add_plan') : t('edit_plan')} onClose={cancel}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input 
          autoFocus
          type="text" 
          placeholder={t('plan_name')} 
          value={name} 
          onChange={e => setName(e.target.value)}
          className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 text-neutral-200"
        />
        <div className="grid grid-cols-2 gap-3">
          <input 
            type="number" 
            step="0.01"
            placeholder={t('amount')} 
            value={amount} 
            onChange={e => setAmount(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 w-full text-neutral-200"
          />
          {!isFlexible ? (
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors text-neutral-300 w-full"
              style={{ colorScheme: 'dark' }}
            />
          ) : (
            <div className="bg-[#0d1117]/50 border border-[#30363d] rounded-xl px-4 py-2.5 text-neutral-600 italic text-sm flex items-center">
              {t('flexible_expense')}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select 
            disabled={isFlexible}
            value={recurrence || 'none'} 
            onChange={e => setRecurrence(e.target.value as Recurrence)}
            className={`bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors text-neutral-300 w-full appearance-none ${isFlexible ? 'opacity-50 grayscale' : ''}`}
          >
            <option value="none">{t('rec_none')}</option>
            <option value="weekly">{t('rec_weekly')}</option>
            <option value="monthly">{t('rec_monthly')}</option>
            <option value="yearly">{t('rec_yearly')}</option>
          </select>
          
          <label className="flex items-center gap-3 px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl cursor-pointer hover:bg-[#30363d]/30 transition-colors group">
            <input 
              type="checkbox"
              checked={isFlexible}
              onChange={e => {
                setIsFlexible(e.target.checked);
                if (e.target.checked) setRecurrence('monthly');
              }}
              className="hidden"
            />
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isFlexible ? 'bg-emerald-500 border-emerald-500' : 'border-neutral-700 group-hover:border-neutral-600'}`}>
              {isFlexible && <CheckCircle2 className="w-3.5 h-3.5 text-neutral-950" />}
            </div>
            <span className="text-xs font-medium text-neutral-400 group-hover:text-neutral-300">{t('flexible_expense')}</span>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <select 
            value={accountId || ''} 
            onChange={e => setAccountId(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors text-neutral-300 w-full appearance-none"
          >
            <option value="">{t('select_account')}</option>
            {accounts.map((acc: any) => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-[#30363d]/50">
          {!isNew && (
            <button type="button" onClick={onRemove} className="px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors mr-auto flex items-center gap-1.5"><Trash2 className="w-4 h-4"/> {t('cancel') === 'Cancel' ? 'Delete' : 'Удалить'}</button>
          )}
          <button type="button" onClick={cancel} className="px-4 py-2.5 text-sm font-medium text-neutral-400 hover:text-white bg-[#0d1117] border border-[#30363d] rounded-xl transition-colors">{t('cancel')}</button>
          <button type="submit" className="px-4 py-2.5 text-sm font-medium bg-emerald-500 text-neutral-950 rounded-xl hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">{t('save_plan')}</button>
        </div>
      </form>
    </Modal>
  )
}

function PaymentManager({ payments, onAdd, onEdit, onRemove, onToggle, t, currency, lang, accounts }: any) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [isFlexible, setIsFlexible] = useState(false);
  const [accountId, setAccountId] = useState('');

  const startAdding = () => {
    setEditingId('new');
    setName('');
    setAmount('');
    setDate('');
    setRecurrence('none');
    setIsFlexible(false);
    setAccountId('');
  };

  const startEditing = (p: Payment) => {
    setEditingId(p.id);
    setName(p.name);
    setAmount(p.amount.toString());
    setDate(p.date || '');
    setRecurrence(p.recurrence || 'none');
    setIsFlexible(p.isFlexible || false);
    setAccountId(p.accountId || '');
  };

  const cancel = () => {
    setEditingId(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    if (!isFlexible && !date) return;
    
    const paymentData = { 
      name, 
      amount: parseFloat(amount), 
      date: isFlexible ? undefined : date, 
      recurrence: isFlexible ? 'monthly' : recurrence, 
      isFlexible,
      accountId: accountId || undefined,
      isActive: true 
    };

    if (editingId === 'new') {
      onAdd(paymentData);
    } else if (editingId) {
      onEdit(editingId, paymentData);
    }
    setEditingId(null);
  };

  const displayRecurrenceIcon = (rec?: Recurrence) => {
    if (!rec || rec === 'none') return null;
    return <Repeat className="w-4 h-4 text-emerald-400" />;
  };

  const displayRecurrenceText = (rec?: Recurrence) => {
    if (!rec || rec === 'none') return null;
    return <span className="text-xs text-emerald-500 ml-1">({t(`rec_${rec}` as TxKey)})</span>;
  };

  return (
    <section className={`${tokens.components.card} p-4 sm:p-5 flex flex-col gap-4 shrink-0 shadow-sm`}>
      <div className="flex items-center justify-between pb-2 border-b border-[#30363d]/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#0d1117] rounded-xl text-emerald-400 border border-[#30363d]">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <h2 className={tokens.typography.cardTitle}>{t('plan_title')}</h2>
            <p className={tokens.typography.secondary}>{lang === 'ru' ? 'Регулярные обязательные платежи и подписки' : 'Regular recurring bills and subscriptions'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => editingId === 'new' ? cancel() : startAdding()}
            className={tokens.components.buttonPrimary}
          >
            {editingId === 'new' ? t('cancel') : <><Plus className="w-3.5 h-3.5" /> {t('add_plan')}</>}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {editingId !== null && (
          <PaymentForm 
            key="form"
            isNew={editingId === 'new'}
            name={name} setName={setName}
            amount={amount} setAmount={setAmount}
            date={date} setDate={setDate}
            recurrence={recurrence} setRecurrence={setRecurrence}
            isFlexible={isFlexible} setIsFlexible={setIsFlexible}
            accountId={accountId} setAccountId={setAccountId} accounts={accounts}
            cancel={cancel} handleSubmit={handleSubmit} 
            onRemove={() => { if (editingId !== 'new') onRemove(editingId); cancel(); }} 
            t={t}
          />
        )}
      </AnimatePresence>

      <div className="text-xs text-neutral-400 bg-[#0d1117] p-3 rounded-xl border border-[#30363d]/60 leading-relaxed">
        <p className="flex gap-2 items-start">
          <strong className="text-neutral-200 whitespace-nowrap">{t('scenario')}</strong> 
          {t('scenario_desc')}
        </p>
      </div>

      <div className="flex flex-col gap-0 overflow-y-auto compact-scrollbar pr-1 max-h-[460px]">
        <AnimatePresence mode="popLayout">
          {payments.length === 0 && (
            <div className="text-neutral-400 italic text-xs text-center py-6">{t('no_plans')}</div>
          )}
          
          {payments.map((payment: Payment) => {
            const isSoon = payment.date ? new Date(payment.date).getTime() <= new Date().getTime() + 7 * 24 * 60 * 60 * 1000 : false;
            return (
               <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={payment.id} 
                className={`flex items-center justify-between py-2.5 px-3 border-b border-[#30363d]/50 transition-all cursor-pointer group rounded-lg
                    ${payment.isActive ? 'hover:bg-[#30363d]/20' : 'opacity-50 hover:bg-[#30363d]/10'}
                `}
                onClick={() => startEditing(payment)}
              >
                <div className="flex items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); onToggle(payment.id); }} className="text-neutral-400 hover:text-emerald-400 transition-colors">
                    {payment.isActive ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4" />}
                  </button>
                  <div>
                    <h4 className={`font-medium text-sm flex items-center gap-1.5 leading-tight ${payment.isActive ? 'text-neutral-200' : 'text-neutral-500 line-through'}`}>
                      {payment.name}
                      {displayRecurrenceIcon(payment.recurrence)}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${isSoon && payment.isActive && (!payment.recurrence || payment.recurrence === 'none') ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-[#0d1117] border border-[#30363d] text-neutral-400'}`}>
                        {payment.isFlexible ? t('flexible_expense') : new Date(payment.date!).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {displayRecurrenceText(payment.recurrence)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`font-semibold text-sm sm:text-base font-mono tabular-nums ${payment.isActive ? 'text-neutral-200' : 'text-neutral-500 line-through'}`}>
                    {formatMoney(payment.amount, currency, lang)}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); startEditing(payment); }} 
                    className="text-neutral-400 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all bg-[#0d1117] border border-[#30363d] rounded-md p-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Activity, 
  Layers, 
  BarChart3, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  Zap, 
  ShieldCheck, 
  Wallet, 
  CreditCard 
} from 'lucide-react';
import { Account, Transaction, Category } from './types';
import { formatMoney } from './utils';

export type TrendViewMode = 'cashflow' | 'net_worth' | 'savings' | 'categories' | 'daily_burn';

interface FinancialTrendsProps {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  salary: number;
  totalMonthlyInterest: number;
  totalDebts: number;
  netWorth: number;
  totalCreditDebt: number;
  periodType: string;
  periodStartDate: Date;
  periodEndDate: Date;
  selectedMonth: number;
  selectedYear: number;
  t: (key: any) => string;
  currency: string;
  lang: string;
}

export function FinancialTrends({
  accounts,
  transactions,
  categories,
  salary,
  totalMonthlyInterest,
  totalDebts,
  netWorth,
  totalCreditDebt,
  periodType,
  periodStartDate,
  periodEndDate,
  selectedMonth,
  selectedYear,
  t,
  currency,
  lang
}: FinancialTrendsProps) {
  const [trendView, setTrendView] = useState<TrendViewMode>('cashflow');
  const [timeHorizon, setTimeHorizon] = useState<'6m' | '12m' | 'all'>(periodType === 'all_time' ? 'all' : '6m');

  useEffect(() => {
    if (periodType === 'all_time') {
      setTimeHorizon('all');
    }
  }, [periodType]);

  const now = new Date();

  // 1. Process Monthly Aggregations
  const { monthlyData, topCategoryNames } = useMemo(() => {
    const txs = transactions || [];
    
    // Group transactions by YYYY-MM
    const map: Record<string, {
      monthKey: string;
      date: Date;
      income: number;
      expense: number;
      net: number;
      savingsRate: number;
      categoryExpenses: Record<string, number>;
    }> = {};

    let sortedKeys: string[] = [];

    if (timeHorizon === 'all') {
      // When "all time" is selected, only group and show months that actually have operations
      txs.forEach((tx) => {
        const d = new Date(tx.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!map[key]) {
          map[key] = {
            monthKey: key,
            date: new Date(d.getFullYear(), d.getMonth(), 1),
            income: 0,
            expense: 0,
            net: 0,
            savingsRate: 0,
            categoryExpenses: {}
          };
        }

        if (tx.type === 'income') {
          map[key].income += tx.amount;
        } else if (tx.type === 'expense') {
          map[key].expense += tx.amount;
          const cat = categories.find(c => c.id === tx.categoryId);
          const catName = cat ? (t(cat.name) || cat.name) : (lang === 'ru' ? 'Прочее' : 'Other');
          map[key].categoryExpenses[catName] = (map[key].categoryExpenses[catName] || 0) + tx.amount;
        }
      });

      // Keep only months with real operations
      const activeKeys = Object.keys(map).filter(key => map[key].income > 0 || map[key].expense > 0);

      if (activeKeys.length > 0) {
        sortedKeys = activeKeys.sort();
      } else {
        // If there are no transactions at all, fallback to a single current month
        const curDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const curKey = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, '0')}`;
        map[curKey] = {
          monthKey: curKey,
          date: curDate,
          income: 0,
          expense: 0,
          net: 0,
          savingsRate: 0,
          categoryExpenses: {}
        };
        sortedKeys = [curKey];
      }
    } else {
      // Fixed sliding window for 6m or 12m
      const monthsBack = timeHorizon === '6m' ? 6 : 12;
      for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        map[key] = {
          monthKey: key,
          date: d,
          income: 0,
          expense: 0,
          net: 0,
          savingsRate: 0,
          categoryExpenses: {}
        };
      }

      // Populate with actual transactions
      txs.forEach((tx) => {
        const d = new Date(tx.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (map[key]) {
          if (tx.type === 'income') {
            map[key].income += tx.amount;
          } else if (tx.type === 'expense') {
            map[key].expense += tx.amount;
            const cat = categories.find(c => c.id === tx.categoryId);
            const catName = cat ? (t(cat.name) || cat.name) : (lang === 'ru' ? 'Прочее' : 'Other');
            map[key].categoryExpenses[catName] = (map[key].categoryExpenses[catName] || 0) + tx.amount;
          }
        }
      });

      sortedKeys = Object.keys(map).sort().slice(-monthsBack);
    }

    // Determine top 5 expense categories overall
    const overallCategoryMap: Record<string, number> = {};
    txs.filter(tx => tx.type === 'expense').forEach(tx => {
      const cat = categories.find(c => c.id === tx.categoryId);
      const catName = cat ? (t(cat.name) || cat.name) : (lang === 'ru' ? 'Прочее' : 'Other');
      overallCategoryMap[catName] = (overallCategoryMap[catName] || 0) + tx.amount;
    });

    const topCats = Object.keys(overallCategoryMap)
      .sort((a, b) => overallCategoryMap[b] - overallCategoryMap[a])
      .slice(0, 5);

    const slicedKeys = sortedKeys;

    // Calculate net and savings rate, and cumulative net worth trajectory
    const months = slicedKeys.map(key => {
      const item = map[key];
      // If income is 0 for current month but salary exists, we don't distort unless transactions exist
      const net = item.income - item.expense;
      const savingsRate = item.income > 0 ? Math.round((net / item.income) * 100) : (item.expense > 0 ? -100 : 0);
      
      const monthLabel = item.date.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short' });
      const yearLabel = item.date.getFullYear().toString().slice(2);
      const displayLabel = `${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} '${yearLabel}`;

      const res: any = {
        key,
        name: displayLabel,
        date: item.date,
        income: item.income,
        expense: item.expense,
        net,
        savingsRate: Math.max(-100, Math.min(100, savingsRate)),
      };

      // Assign top categories
      topCats.forEach(cat => {
        res[cat] = item.categoryExpenses[cat] || 0;
      });

      return res;
    });

    // Reconstruct Net Worth Trajectory backwards from current net worth
    // netWorthToday = netWorth, earlier months = current - (subsequent net savings)
    let runningNetWorth = netWorth;
    const reversed = [...months].reverse();
    const withNetWorthReversed = reversed.map((m, idx) => {
      if (idx === 0) {
        m.accumulatedCapital = runningNetWorth;
      } else {
        // previous month net worth before the subsequent month's net change
        runningNetWorth = runningNetWorth - reversed[idx - 1].net;
        m.accumulatedCapital = runningNetWorth;
      }
      return m;
    });
    const finalMonthlyData = withNetWorthReversed.reverse();

    return { monthlyData: finalMonthlyData, topCategoryNames: topCats };
  }, [transactions, categories, timeHorizon, now, lang, t, netWorth]);

  // 2. Daily Burn Data for active period
  const dailyBurnData = useMemo(() => {
    const txs = (transactions || []).filter(tx => {
      const d = new Date(tx.date).getTime();
      return tx.type === 'expense' && d >= periodStartDate.getTime() && d <= periodEndDate.getTime();
    });

    const isMonth = periodType === 'month';
    const totalDays = isMonth ? new Date(selectedYear, selectedMonth + 1, 0).getDate() : 30;
    const currentDayLimit = (periodType === 'month' && selectedYear === now.getFullYear() && selectedMonth === now.getMonth())
      ? now.getDate()
      : totalDays;

    // Group expenses by day
    const dayExpenseMap: Record<number, number> = {};
    txs.forEach(tx => {
      const d = new Date(tx.date);
      const day = d.getDate();
      dayExpenseMap[day] = (dayExpenseMap[day] || 0) + tx.amount;
    });

    const totalExpenseInPeriod = txs.reduce((s, tx) => s + tx.amount, 0);
    const targetDailyPace = totalExpenseInPeriod > 0 ? totalExpenseInPeriod / totalDays : 1000;

    let cumulativeSpend = 0;
    const result = [];
    for (let day = 1; day <= totalDays; day++) {
      const daySpend = dayExpenseMap[day] || 0;
      if (day <= currentDayLimit) {
        cumulativeSpend += daySpend;
      }
      result.push({
        day: `${day} ${lang === 'ru' ? 'число' : 'day'}`,
        dayNumber: day,
        actualSpend: day <= currentDayLimit ? cumulativeSpend : null,
        dailySpend: daySpend,
        idealPace: Math.round(targetDailyPace * day),
      });
    }
    return result;
  }, [transactions, periodStartDate, periodEndDate, periodType, selectedMonth, selectedYear, now, lang]);

  // High-level Averages & Stats
  const activeMonthsWithData = monthlyData.filter(m => m.income > 0 || m.expense > 0);
  const dataCount = Math.max(1, activeMonthsWithData.length);
  const avgMonthlyIncome = Math.round(monthlyData.reduce((s, m) => s + m.income, 0) / dataCount);
  const avgMonthlyExpense = Math.round(monthlyData.reduce((s, m) => s + m.expense, 0) / dataCount);
  const avgNet = avgMonthlyIncome - avgMonthlyExpense;
  const avgSavingsRate = avgMonthlyIncome > 0 ? Math.round((avgNet / avgMonthlyIncome) * 100) : 0;

  // Category Colors Palette
  const categoryPalette = ['#38bdf8', '#f43f5e', '#a855f7', '#fbbf24', '#34d399', '#94a3b8'];

  return (
    <section className="flex flex-col bg-[#161b22] border border-[#30363d] rounded-2xl p-4 sm:p-6 gap-5 shadow-sm">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#30363d]/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#0d1117] rounded-lg text-emerald-400 border border-[#30363d]">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-white">
              {t('trends_title') || (lang === 'ru' ? 'Тренды и аналитика динамики' : 'Financial Trends & Trajectory')}
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {t('trends_subtitle') || (lang === 'ru' 
              ? 'Денежный поток, динамика чистого капитала, сальдо и структура трат' 
              : 'Cash flow dynamics, net worth growth, monthly savings margin and category spend')}
          </p>
        </div>

        {/* Time Horizon Selector */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex bg-[#0d1117] border border-[#30363d] rounded-xl p-0.5 text-xs font-medium">
            <button
              onClick={() => setTimeHorizon('6m')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeHorizon === '6m' ? 'bg-[#161b22] text-emerald-400 font-semibold shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {lang === 'ru' ? '6 мес' : '6 mo'}
            </button>
            <button
              onClick={() => setTimeHorizon('12m')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeHorizon === '12m' ? 'bg-[#161b22] text-emerald-400 font-semibold shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {lang === 'ru' ? '12 мес' : '12 mo'}
            </button>
            <button
              onClick={() => setTimeHorizon('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeHorizon === 'all' ? 'bg-[#161b22] text-emerald-400 font-semibold shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {lang === 'ru' ? 'Всё время' : 'All time'}
            </button>
          </div>
        </div>
      </div>

      {/* Metric KPI Pills */}
      {(() => {
        const horizonTag = timeHorizon === '6m' ? (lang === 'ru' ? 'за 6 мес' : '6 mo') : timeHorizon === '12m' ? (lang === 'ru' ? 'за 12 мес' : '12 mo') : (lang === 'ru' ? 'всё время' : 'all');
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col justify-between">
              <span className="text-xs uppercase font-medium tracking-wider text-neutral-400">
                {lang === 'ru' ? `Ср. доход / мес (${horizonTag})` : `Avg Income / mo (${horizonTag})`}
              </span>
              <span className="text-base sm:text-lg font-bold font-mono tracking-tight tabular-nums text-emerald-400 mt-1">
                {formatMoney(avgMonthlyIncome, currency, lang)}
              </span>
            </div>

            <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col justify-between">
              <span className="text-xs uppercase font-medium tracking-wider text-neutral-400">
                {lang === 'ru' ? `Ср. расход / мес (${horizonTag})` : `Avg Spend / mo (${horizonTag})`}
              </span>
              <span className="text-base sm:text-lg font-bold font-mono tracking-tight tabular-nums text-rose-400 mt-1">
                {formatMoney(avgMonthlyExpense, currency, lang)}
              </span>
            </div>

            <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col justify-between">
              <span className="text-xs uppercase font-medium tracking-wider text-neutral-400">
                {lang === 'ru' ? `Ср. сальдо (${horizonTag})` : `Avg Net Flow (${horizonTag})`}
              </span>
              <span className={`text-base sm:text-lg font-bold font-mono tracking-tight tabular-nums mt-1 ${avgNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {avgNet >= 0 ? '+' : ''}{formatMoney(avgNet, currency, lang)}
              </span>
              <span className={`text-xs mt-0.5 font-medium ${avgSavingsRate < 0 ? 'text-rose-400' : 'text-neutral-400'}`}>
                {lang === 'ru' ? 'Норма:' : 'Margin:'} {avgSavingsRate}%
              </span>
            </div>

            <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col justify-between">
              <span className="text-xs uppercase font-medium tracking-wider text-neutral-400">
                {lang === 'ru' ? 'Капитал' : 'Capital'}
              </span>
              <span className="text-base sm:text-lg font-bold font-mono tracking-tight tabular-nums mt-1 text-emerald-400">
                {formatMoney(netWorth, currency, lang)}
              </span>
              <span className="text-xs text-neutral-400 mt-0.5">
                {lang === 'ru' ? 'настоящие деньги' : 'real funds available'}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Trend View Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 compact-scrollbar border-b border-[#30363d]/40">
        <button
          onClick={() => setTrendView('cashflow')}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
            trendView === 'cashflow'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#0d1117]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>{t('trend_cashflow') || (lang === 'ru' ? 'Доходы и расходы' : 'Income vs Expenses')}</span>
        </button>

        <button
          onClick={() => setTrendView('net_worth')}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
            trendView === 'net_worth'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#0d1117]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{t('trend_net_worth') || (lang === 'ru' ? 'Динамика капитала' : 'Net Worth Growth')}</span>
        </button>

        <button
          onClick={() => setTrendView('savings')}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
            trendView === 'savings'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#0d1117]'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{t('trend_savings') || (lang === 'ru' ? 'Сальдо сбережений' : 'Net Savings & Margin')}</span>
        </button>

        <button
          onClick={() => setTrendView('categories')}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
            trendView === 'categories'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#0d1117]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{t('trend_categories') || (lang === 'ru' ? 'Тренды по категориям' : 'Category Spending')}</span>
        </button>

        <button
          onClick={() => setTrendView('daily_burn')}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
            trendView === 'daily_burn'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#0d1117]'
          }`}
        >
          <LineChartIcon className="w-3.5 h-3.5" />
          <span>{t('trend_daily_burn') || (lang === 'ru' ? 'Дневной темп трат' : 'Daily Pace')}</span>
        </button>
      </div>

      {/* Main Chart Rendering Container */}
      <div className="w-full h-[320px] pt-2">
        {/* VIEW 1: CASHFLOW (INCOME VS EXPENSE) */}
        {trendView === 'cashflow' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis 
                stroke="#9ca3af" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} 
                width={45}
              />
              <Tooltip 
                cursor={{ fill: '#30363d', opacity: 0.2 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const dataObj = payload[0].payload;
                    return (
                      <div className="bg-[#161b22] border border-[#30363d] p-3.5 rounded-xl shadow-2xl z-50 text-xs font-mono">
                        <p className="font-semibold text-neutral-200 mb-2 border-b border-[#30363d] pb-1 font-sans">{label}</p>
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className="text-emerald-400 font-sans">{t('income')}:</span>
                          <span className="font-semibold text-neutral-100">+{formatMoney(dataObj.income, currency, lang)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className="text-red-400 font-sans">{t('expenses')}:</span>
                          <span className="font-semibold text-neutral-100">-{formatMoney(dataObj.expense, currency, lang)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-[#30363d]/60">
                          <span className="text-neutral-400 font-sans">{lang === 'ru' ? 'Сальдо:' : 'Net Margin:'}</span>
                          <span className={`font-bold ${dataObj.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {dataObj.net >= 0 ? '+' : ''}{formatMoney(dataObj.net, currency, lang)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af', paddingTop: '10px' }} iconType="circle" />
              <Bar dataKey="income" name={t('income')} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="expense" name={t('expenses')} fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* VIEW 2: NET WORTH TRAJECTORY */}
        {trendView === 'net_worth' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis 
                stroke="#9ca3af" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} 
                width={45}
              />
              <Tooltip 
                cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '3 3' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const dataObj = payload[0].payload;
                    return (
                      <div className="bg-[#161b22] border border-[#30363d] p-3.5 rounded-xl shadow-2xl z-50 text-xs font-mono">
                        <p className="font-semibold text-neutral-200 mb-2 border-b border-[#30363d] pb-1 font-sans">{label}</p>
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className="text-emerald-400 font-sans">{lang === 'ru' ? 'Капитал на конец месяца:' : 'Capital at Month End:'}</span>
                          <span className="font-bold text-base text-neutral-100">{formatMoney(dataObj.accumulatedCapital, currency, lang)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1 border-t border-[#30363d]/60 text-neutral-400 font-sans">
                          <span>{lang === 'ru' ? 'Изменение за месяц:' : 'Monthly Delta:'}</span>
                          <span className={`font-mono font-semibold ${dataObj.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {dataObj.net >= 0 ? '+' : ''}{formatMoney(dataObj.net, currency, lang)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="accumulatedCapital" 
                name={lang === 'ru' ? 'Капитал' : 'Capital'} 
                stroke="#10b981" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#netWorthGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* VIEW 3: NET SAVINGS & SURPLUS/DEFICIT */}
        {trendView === 'savings' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
              <ReferenceLine y={0} stroke="#4b5563" strokeWidth={1.5} />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis 
                stroke="#9ca3af" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} 
                width={45}
              />
              <Tooltip 
                cursor={{ fill: '#30363d', opacity: 0.2 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const dataObj = payload[0].payload;
                    const isPositive = dataObj.net >= 0;
                    return (
                      <div className="bg-[#161b22] border border-[#30363d] p-3.5 rounded-xl shadow-2xl z-50 text-xs font-mono">
                        <p className="font-semibold text-neutral-200 mb-2 border-b border-[#30363d] pb-1 font-sans">{label}</p>
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className="text-neutral-400 font-sans">{isPositive ? (lang === 'ru' ? 'Профицит:' : 'Surplus:') : (lang === 'ru' ? 'Дефицит:' : 'Deficit:')}</span>
                          <span className={`font-bold text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{formatMoney(dataObj.net, currency, lang)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-[#30363d]/60 text-neutral-400 font-sans">
                          <span>{lang === 'ru' ? 'Норма сбережений:' : 'Savings Rate:'}</span>
                          <span className="font-mono font-semibold text-neutral-200">{dataObj.savingsRate}%</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="net" 
                name={lang === 'ru' ? 'Чистое сальдо' : 'Net Savings'} 
                radius={[4, 4, 0, 0]} 
                maxBarSize={32}
              >
                {monthlyData.map((entry, index) => (
                  <Cell 
                    key={`cell-net-${index}`} 
                    fill={entry.net >= 0 ? '#10b981' : '#ef4444'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* VIEW 4: CATEGORY SPENDING TRENDS */}
        {trendView === 'categories' && (
          topCategoryNames.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} 
                  width={45}
                />
                <Tooltip 
                  cursor={{ fill: '#30363d', opacity: 0.2 }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-xl shadow-2xl z-50 text-xs font-mono">
                          <p className="font-semibold text-neutral-200 mb-2 border-b border-[#30363d] pb-1 font-sans">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center justify-between gap-4 text-xs mb-1 last:mb-0">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-neutral-400 font-sans">{entry.name}:</span>
                              </div>
                              <span className="font-semibold text-neutral-100">{formatMoney(entry.value, currency, lang)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af', paddingTop: '10px' }} iconType="circle" />
                {topCategoryNames.map((cat, idx) => (
                  <Bar 
                    key={cat} 
                    dataKey={cat} 
                    name={cat} 
                    fill={categoryPalette[idx % categoryPalette.length]} 
                    stackId="catStack"
                    radius={idx === topCategoryNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    maxBarSize={32} 
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-neutral-500 text-xs">
              <Layers className="w-8 h-8 mb-2 opacity-30 text-neutral-400" />
              <p>{lang === 'ru' ? 'Нет данных о тратах по категориям.' : 'No category spend recorded yet.'}</p>
              <p className="text-xs text-neutral-400 mt-1">{lang === 'ru' ? 'График появится после добавления расходов с категориями' : 'Chart builds as you log expenses with categories'}</p>
            </div>
          )
        )}

        {/* VIEW 5: DAILY SPENDING PACE & VELOCITY */}
        {trendView === 'daily_burn' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyBurnData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="dailySpendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
              <XAxis dataKey="dayNumber" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(d) => `${d}`} />
              <YAxis 
                stroke="#9ca3af" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} 
                width={45}
              />
              <Tooltip 
                cursor={{ stroke: '#38bdf8', strokeWidth: 1, strokeDasharray: '3 3' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const dataObj = payload[0].payload;
                    return (
                      <div className="bg-[#161b22] border border-[#30363d] p-3.5 rounded-xl shadow-2xl z-50 text-xs font-mono">
                        <p className="font-semibold text-neutral-200 mb-2 border-b border-[#30363d] pb-1 font-sans">
                          {dataObj.day}
                        </p>
                        {dataObj.actualSpend !== null && (
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span className="text-sky-400 font-sans">{lang === 'ru' ? 'Накоплено трат:' : 'Cumulative spend:'}</span>
                            <span className="font-bold text-neutral-100">{formatMoney(dataObj.actualSpend, currency, lang)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-4 mb-1 text-neutral-400 font-sans">
                          <span>{lang === 'ru' ? 'Равномерный ориентир:' : 'Target pace:'}</span>
                          <span className="font-mono font-semibold text-neutral-300">{formatMoney(dataObj.idealPace, currency, lang)}</span>
                        </div>
                        {dataObj.dailySpend > 0 && (
                          <div className="flex items-center justify-between gap-4 pt-1 border-t border-[#30363d]/60 text-amber-400 font-sans">
                            <span>{lang === 'ru' ? 'Траты за этот день:' : 'Spend this day:'}</span>
                            <span className="font-mono font-bold">+{formatMoney(dataObj.dailySpend, currency, lang)}</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af', paddingTop: '10px' }} iconType="circle" />
              <Area 
                type="monotone" 
                dataKey="actualSpend" 
                name={lang === 'ru' ? 'Траты накопительно' : 'Cumulative Spend'} 
                stroke="#38bdf8" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#dailySpendGradient)" 
                connectNulls={false}
              />
              <Line 
                type="monotone" 
                dataKey="idealPace" 
                name={lang === 'ru' ? 'Равномерный темп' : 'Ideal Linear Pace'} 
                stroke="#6b7280" 
                strokeWidth={1.5} 
                strokeDasharray="4 4" 
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

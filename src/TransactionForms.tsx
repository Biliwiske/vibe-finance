
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatMoney } from './utils';
import { Recurrence, Category, AccountType } from './types';
import { 
  Wallet, X, Search, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Calendar, MessageSquare, QrCode, Repeat, History, Clock, Check, Trash2,
  ShoppingBag, ShoppingCart, Car, Home, Briefcase, Coffee, Gift, Heart, Music, Smartphone, Plane, Book, Film, Activity, Box, Plus, Landmark, PiggyBank,
  Flame, Sparkles, Layers, FolderPlus, SlidersHorizontal, Utensils, Store, Smile, Wrench, Bus,
  UtensilsCrossed, Truck, CircleDot, Key, Building, Zap, Sofa, Wifi, Shirt, Laptop, Package, Pill, Stethoscope, Dumbbell, Clapperboard, Tv, Gamepad2, GraduationCap, PawPrint, Percent, CreditCard
} from 'lucide-react';

export const FULL_BANKS = [
  { id: 'tinkoff', name: 'Т-Банк', sub: 'Россия • 27 510 человек', icon: 'T', color: 'text-black', bg: 'bg-[#ffdd2d]', logo: null },
  { id: 'sberbank', name: 'СберБанк', sub: 'Россия • 18 780 человек', icon: 'S', color: 'text-white', bg: 'bg-[#21a038]', logo: CheckCircle2 },
  { id: 'alfa', name: 'Альфа-Банк', sub: 'Россия • 14 450 человек', icon: 'A', color: 'text-white', bg: 'bg-[#ef3124]', logo: null },
  { id: 'ozon', name: 'Ozon Банк', sub: 'Россия • 10 360 человек', icon: 'O', color: 'text-white', bg: 'bg-[#005bff]', logo: null },
  { id: 'vtb', name: 'Банк ВТБ', sub: 'Россия • 9 210 человек', icon: 'V', color: 'text-white', bg: 'bg-[#0a2896]', logo: null },
  { id: 'yandex', name: 'Яндекс Банк', sub: 'Россия • 9 030 человек', icon: 'Я', color: 'text-black font-black', bg: 'bg-[#ffcc00]', logo: null },
  { id: 'sovcom', name: 'Совкомбанк', sub: 'Россия • 2 280 человек', icon: 'C', color: 'text-white', bg: 'bg-[#ea3235]', logo: null },
  { id: 'raiffeisen', name: 'Райффайзенбанк', sub: 'Россия • 1 930 человек', icon: 'X', color: 'text-black', bg: 'bg-[#ffee00]', logo: null },
  { id: 'gazprom', name: 'Газпромбанк', sub: 'Россия • 1 870 человек', icon: 'G', color: 'text-white', bg: 'bg-[#003c96]', logo: null },
  { id: 'revolut', name: 'Revolut', sub: 'Весь мир • 1 530 человек', icon: 'R', color: 'text-black', bg: 'bg-white', logo: null },
  { id: 'none', name: 'Другой / Наличные', sub: '', icon: '💰', color: 'text-white', bg: 'bg-neutral-700', logo: null }
];

function getAccountTypeLabel(type: AccountType | undefined, lang: string) {
  const labels: Record<AccountType, [string, string]> = {
    checking: ['Карта', 'Card'],
    credit: ['Кредитная карта', 'Credit card'],
    savings: ['Накопительный счёт', 'Savings account'],
    deposit: ['Вклад', 'Deposit'],
    cash: ['Наличные', 'Cash'],
    crypto: ['Криптовалюта', 'Cryptocurrency'],
    debt: ['Кредит / долг', 'Loan / debt'],
  };

  const [ru, en] = labels[type || 'checking'];
  return lang === 'ru' ? ru : en;
}

export const CATEGORY_COLORS: Record<string, string> = {
  yellow: 'text-yellow-500 border-yellow-500 bg-yellow-500/10',
  purple: 'text-purple-500 border-purple-500 bg-purple-500/10',
  pink: 'text-pink-500 border-pink-500 bg-pink-500/10',
  red: 'text-red-500 border-red-500 bg-red-500/10',
  orange: 'text-orange-500 border-orange-500 bg-orange-500/10',
  amber: 'text-amber-500 border-amber-500 bg-amber-500/10',
  blue: 'text-blue-500 border-blue-500 bg-blue-500/10',
  teal: 'text-teal-500 border-teal-500 bg-teal-500/10',
  green: 'text-green-500 border-green-500 bg-green-500/10',
  emerald: 'text-emerald-500 border-emerald-500 bg-emerald-500/10',
  cyan: 'text-cyan-500 border-cyan-500 bg-cyan-500/10',
  sky: 'text-sky-500 border-sky-500 bg-sky-500/10',
  indigo: 'text-indigo-500 border-indigo-500 bg-indigo-500/10',
  rose: 'text-rose-500 border-rose-500 bg-rose-500/10',
  neutral: 'text-neutral-400 border-neutral-400 bg-neutral-500/10',
};

// Map string names to components
export const IconMap: Record<string, any> = {
  ShoppingBag, ShoppingCart, Car, Home, Briefcase, Coffee, Gift, Heart, Music, Smartphone, Plane, Book, Film, Activity, Box, Landmark, PiggyBank,
  Flame, Sparkles, Layers, FolderPlus, SlidersHorizontal, Utensils, Store, Smile, Wrench, Bus,
  UtensilsCrossed, Truck, CircleDot, Key, Building, Zap, Sofa, Wifi, Shirt, Laptop, Package, Pill, Stethoscope, Dumbbell, Clapperboard, Tv, Gamepad2, GraduationCap, PawPrint, Percent, CreditCard
};

export function getCategoryMeta(categories: Category[], categoryId: string, t: (k: string) => string) {
  const cat = categories.find(c => c.id === categoryId);
  if (!cat) return { name: '—', fullName: '—', parentName: '', icon: 'Box', color: 'neutral', parent: null, isSubcategory: false };
  
  if (cat.parentId) {
    const parent = categories.find(c => c.id === cat.parentId);
    const parentName = parent ? t(parent.name) : '';
    const selfName = t(cat.name);
    return {
      ...cat,
      name: selfName,
      fullName: parentName ? `${parentName} • ${selfName}` : selfName,
      parentName,
      parent,
      isSubcategory: true
    };
  }

  return {
    ...cat,
    name: t(cat.name),
    fullName: t(cat.name),
    parentName: '',
    parent: null,
    isSubcategory: false
  };
}

export function BankSelectorModal({ onSelect, onClose }: { onSelect: (id: string) => void, onClose: () => void }) {
  const [search, setSearch] = useState('');
  
  const filtered = FULL_BANKS.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4 safe-area-fullscreen bg-black/75 backdrop-blur-sm overflow-hidden" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-[480px] bg-[#161b22] border-0 sm:border sm:border-[#30363d] sm:rounded-2xl shadow-2xl flex flex-col font-sans overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 h-14 border-b border-[#30363d]/60 bg-[#0d1117]/80 shrink-0 justify-between">
          <button onClick={onClose} className="p-1.5 -ml-1 text-neutral-400 hover:text-white rounded-lg hover:bg-[#161b22] transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-white">Выберите банк</h2>
          <div className="w-6" />
        </div>
        
        <div className="p-3 sm:px-4 bg-[#0d1117] border-b border-[#30363d]/50 shrink-0">
          <div className="flex items-center bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-neutral-500 mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Поиск банка..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-white w-full text-sm placeholder:text-neutral-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto compact-scrollbar divide-y divide-[#30363d]/30">
          {filtered.map(bank => (
            <div 
              key={bank.id} 
              onClick={() => { onSelect(bank.id); onClose(); }}
              className="flex items-center px-4 py-3 hover:bg-[#0d1117] cursor-pointer transition-colors"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold shrink-0 ${bank.bg} ${bank.color}`}>
                {bank.logo ? <bank.logo className="w-5 h-5" /> : bank.icon}
              </div>
              <div className="ml-3">
                <div className="text-white text-sm font-medium">{bank.name}</div>
                {bank.sub && (
                  <div className="text-neutral-500 text-xs mt-0.5 flex items-center gap-1.5">
                     <div className="w-3 h-2 rounded-sm bg-gradient-to-b from-white via-blue-500 to-red-500" />
                     <span>{bank.sub}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export function FullCategorySelector({ type, categories, onSelect, onAdd, onClose, t, lang = 'ru' }: any) {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>(type);
  const [search, setSearch] = useState('');
  // Requirement 2: Categories collapsible, collapsed by default
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredCategories = categories.filter((c: Category) => c.type === activeTab);
  
  // Find top-level categories (no parentId)
  const parentCategories = filteredCategories.filter((c: Category) => !c.parentId);
  
  // Group subcategories by parentId
  const subcategoriesMap = filteredCategories.reduce((acc: Record<string, Category[]>, c: Category) => {
    if (c.parentId) {
      if (!acc[c.parentId]) acc[c.parentId] = [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {});

  // If search query is entered, filter across all and auto-expand matches
  const searchFilter = (cat: Category) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nameMatch = t(cat.name).toLowerCase().includes(q);
    if (nameMatch) return true;
    const subs = subcategoriesMap[cat.id] || [];
    return subs.some(s => t(s.name).toLowerCase().includes(q));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4 safe-area-fullscreen bg-black/75 backdrop-blur-sm overflow-hidden" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="w-full h-full sm:h-auto sm:max-h-[88vh] sm:max-w-[540px] bg-[#161b22] border-0 sm:border sm:border-[#30363d] sm:rounded-2xl shadow-2xl flex flex-col font-sans overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with comfortable spacing (Requirement 4: "+ Создать" not flush against edge) */}
        <div className="flex items-center px-4 sm:px-5 h-14 shrink-0 border-b border-[#30363d]/60 bg-[#0d1117]/80 justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1.5 -ml-1 text-neutral-400 hover:text-white rounded-lg hover:bg-[#161b22] transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-semibold text-white">
              {lang === 'ru' ? 'Категории' : 'Categories'}
            </h2>
          </div>
          <button 
            onClick={() => onAdd(null)}
            className="px-3.5 py-1.5 mr-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/35 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ru' ? 'Создать' : 'New'}</span>
          </button>
        </div>

        {/* Tabs: Expense vs Income */}
        <div className="flex px-4 sm:px-5 border-b border-[#30363d]/50 bg-[#0d1117]">
          <button 
            onClick={() => setActiveTab('expense')}
            className={`flex-1 pb-3 pt-3 text-sm font-medium transition-colors ${activeTab === 'expense' ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            {lang === 'ru' ? 'Расход' : 'Expense'}
          </button>
          <button 
            onClick={() => setActiveTab('income')}
            className={`flex-1 pb-3 pt-3 text-sm font-medium transition-colors ${activeTab === 'income' ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            {lang === 'ru' ? 'Доход' : 'Income'}
          </button>
        </div>

        {/* Search */}
        <div className="p-3 sm:px-5 bg-[#0d1117] border-b border-[#30363d]/50 shrink-0">
          <div className="flex items-center bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-neutral-500 mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder={lang === 'ru' ? 'Поиск категории или подкатегории...' : 'Search category or subcategory...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-white w-full text-xs sm:text-sm placeholder:text-neutral-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-neutral-500 hover:text-neutral-300">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Requirement 3: Single explanatory banner at top instead of repeating inside every category */}
        <div className="px-4 sm:px-5 py-2 bg-[#0d1117]/80 border-b border-[#30363d]/40 text-xs text-neutral-400 flex items-center justify-between">
          <span>{lang === 'ru' ? '💡 Нажмите на категорию для выбора всей группы или раскройте подкатегории' : '💡 Tap category to select whole group or expand subcategories'}</span>
        </div>

        {/* Categories Tree list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 compact-scrollbar">
          {parentCategories.filter(searchFilter).map(parent => {
            const subs = (subcategoriesMap[parent.id] || []).filter(s => 
              !search.trim() || t(s.name).toLowerCase().includes(search.toLowerCase()) || t(parent.name).toLowerCase().includes(search.toLowerCase())
            );
            const ParentIcon = IconMap[parent.icon] || ShoppingBag;
            const colorClass = CATEGORY_COLORS[parent.color || 'neutral'] || CATEGORY_COLORS['neutral'];
            // Requirement 2: Collapsed by default; auto-expand if searching
            const isExpanded = search.trim() ? true : !!expandedParents[parent.id];

            return (
              <div key={parent.id} className="bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden shadow-sm transition-all hover:border-[#30363d]/90">
                {/* Parent Category Header */}
                <div className="flex items-center justify-between p-3 hover:bg-[#161b22] transition-colors">
                  <div 
                    onClick={() => { onSelect(parent.id); onClose(); }} 
                    className="flex items-center gap-3 flex-1 cursor-pointer group min-w-0"
                  >
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center bg-[#161b22] ${colorClass} group-hover:scale-105 transition-transform shrink-0`}>
                      <ParentIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-xs sm:text-sm text-white group-hover:text-emerald-400 transition-colors truncate">
                          {t(parent.name)}
                        </h4>
                        {subs.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#161b22] border border-[#30363d] text-neutral-400 font-mono shrink-0">
                            {subs.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdd(parent.id);
                      }}
                      title={lang === 'ru' ? 'Добавить подкатегорию' : 'Add subcategory'}
                      className="p-1.5 text-neutral-400 hover:text-emerald-400 hover:bg-[#161b22] rounded-lg border border-transparent hover:border-[#30363d] transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {subs.length > 0 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(parent.id);
                        }}
                        className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                        title={isExpanded ? (lang === 'ru' ? 'Свернуть' : 'Collapse') : (lang === 'ru' ? 'Развернуть' : 'Expand')}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-emerald-400" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Subcategories compact flow chips (Requirement 1: "Подкатегории показывай компактными чипами в одну сетку вместо больших полноширинных плиток, чтобы не было пустых мест в неполных рядах.") */}
                {subs.length > 0 && isExpanded && (
                  <div className="p-2.5 bg-[#161b22]/60 border-t border-[#30363d]/50 flex flex-wrap gap-1.5">
                    {subs.map(sub => {
                      const SubIcon = IconMap[sub.icon] || ParentIcon;
                      const subColorClass = CATEGORY_COLORS[sub.color || parent.color || 'neutral'] || CATEGORY_COLORS['neutral'];
                      
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => { onSelect(sub.id); onClose(); }}
                          className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-[#0d1117] hover:bg-[#161b22] border border-[#30363d] hover:border-emerald-500/50 text-neutral-200 hover:text-white transition-all text-xs group"
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${subColorClass}`}>
                            <SubIcon className="w-3 h-3" />
                          </div>
                          <span className="font-medium truncate max-w-[150px] sm:max-w-[200px]">
                            {t(sub.name)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Create category button at bottom with proper padding */}
          <div className="pt-2">
            <button 
              onClick={() => onAdd(null)}
              className="w-full py-2.5 border border-dashed border-[#30363d] hover:border-emerald-500/50 rounded-xl flex items-center justify-center gap-2 text-neutral-400 hover:text-emerald-400 bg-[#0d1117] hover:bg-[#161b22] transition-all text-xs font-medium"
            >
              <FolderPlus className="w-4 h-4" />
              <span>{lang === 'ru' ? 'Создать новую категорию или подкатегорию' : 'Create new category or subcategory'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function NewTransactionForm({ 
  isNew, amount, setAmount, type, setType, categoryId, setCategoryId, 
  accountId, setAccountId, date, setDate, note, setNote, 
  isRecurring, setIsRecurring, recurrence, setRecurrence,
  skipBalanceUpdate, setSkipBalanceUpdate,
  categories, accounts, transactions = [], cancel, handleSubmit, onRemove, t, currency, lang = 'ru', onAddCategory 
}: any) {
  const [showCatSelector, setShowCatSelector] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [isExtraOpen, setIsExtraOpen] = useState(Boolean(skipBalanceUpdate || isRecurring));

  const isIncome = type === 'income';
  const selectedAcc = accounts.find((a: any) => a.id === accountId);
  const bankInfo = selectedAcc ? FULL_BANKS.find(b => b.id === selectedAcc.bank) : null;

  // Selected category metadata with parent breadcrumb
  const catMeta = getCategoryMeta(categories, categoryId, t);
  const SelectedCatIcon = IconMap[catMeta.icon] || (isIncome ? Gift : ShoppingBag);
  const selectedCatColor = CATEGORY_COLORS[catMeta.color || 'neutral'] || CATEGORY_COLORS['neutral'];

  // Smart quick categories: show recently used categories based on transactions history
  const quickCategories = useMemo(() => {
    const list: Category[] = [];
    const seen = new Set<string>();

    // 1. Scan recent transactions (newest first) matching current type
    if (Array.isArray(transactions) && transactions.length > 0) {
      for (const tx of transactions) {
        if (tx.type === type && tx.categoryId && !seen.has(tx.categoryId)) {
          const cat = categories.find((c: any) => c.id === tx.categoryId);
          if (cat) {
            seen.add(tx.categoryId);
            list.push(cat);
            if (list.length >= 6) break;
          }
        }
      }
    }

    // 2. Fallbacks if user doesn't have 6 recent categories
    if (list.length < 6) {
      const priorityIds = type === 'expense'
        ? ['exp_supermarkets', 'exp_fastfood', 'exp_cafe', 'exp_public_transport', 'exp_taxi', 'exp_pharmacy', 'exp_utilities', 'exp_rent', 'exp_clothing']
        : ['1', 'inc_bonus', 'inc_deposit', 'inc_savings', 'inc_cashback', 'inc_4'];

      for (const id of priorityIds) {
        if (!seen.has(id)) {
          const found = categories.find((c: any) => c.id === id && c.type === type);
          if (found) {
            seen.add(id);
            list.push(found);
            if (list.length >= 6) break;
          }
        }
      }
    }

    // 3. Any remaining categories of this type to ensure 6 chips
    if (list.length < 6) {
      for (const cat of categories) {
        if (cat.type === type && !seen.has(cat.id)) {
          seen.add(cat.id);
          list.push(cat);
          if (list.length >= 6) break;
        }
      }
    }

    return list;
  }, [transactions, categories, type]);

  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    RUB: '₽',
    GBP: '£'
  };
  const currSymbol = currencySymbols[currency] || '₽';

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const formatDateDisplay = (dStr: string) => {
    if (!dStr) return '';
    const d = new Date(dStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dStr;
    
    const isToday = dStr === todayStr;
    const isYesterday = dStr === yesterdayStr;
    
    const day = d.getDate();
    const monthNamesRu = ['янв', 'февр', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сент', 'окт', 'нояб', 'дек'];
    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = lang === 'ru' ? monthNamesRu[d.getMonth()] : monthNamesEn[d.getMonth()];
    const year = d.getFullYear();
    
    if (isToday) {
      return lang === 'ru' ? `Сегодня, ${day} ${monthName}` : `Today, ${monthName} ${day}`;
    }
    if (isYesterday) {
      return lang === 'ru' ? `Вчера, ${day} ${monthName}` : `Yesterday, ${monthName} ${day}`;
    }
    return lang === 'ru' ? `${day} ${monthName} ${year}` : `${monthName} ${day}, ${year}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-4 safe-area-fullscreen bg-black/75 backdrop-blur-sm overflow-hidden"
      onClick={cancel}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-[520px] bg-[#161b22] border-0 sm:border sm:border-[#30363d] sm:rounded-2xl shadow-2xl flex flex-col font-sans overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 h-14 shrink-0 border-b border-[#30363d]/60 bg-[#0d1117]">
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={cancel} 
              className="p-1.5 -ml-1 text-neutral-400 hover:text-white rounded-lg hover:bg-[#161b22] transition-colors"
              title={lang === 'ru' ? 'Закрыть' : 'Close'}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-semibold text-white">
              {isNew 
                ? (lang === 'ru' ? 'Новая операция' : 'New Transaction') 
                : (lang === 'ru' ? 'Редактировать операцию' : 'Edit Transaction')}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {!isNew && (
              <button 
                type="button" 
                onClick={onRemove} 
                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                title={lang === 'ru' ? 'Удалить операцию' : 'Delete'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button 
              type="button" 
              onClick={cancel} 
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#161b22] rounded-lg transition-colors hidden sm:block"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Type Tabs: Expense / Income */}
        <div className="flex px-4 sm:px-5 border-b border-[#30363d]/60 bg-[#0d1117] shrink-0">
          <button 
            type="button"
            onClick={() => {
              setType('expense');
              const firstCat = categories.find((c: any) => c.type === 'expense');
              if (firstCat) setCategoryId(firstCat.id);
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
              type === 'expense' 
                ? 'text-rose-400 border-rose-500' 
                : 'text-neutral-400 border-transparent hover:text-neutral-200'
            }`}
          >
            {lang === 'ru' ? 'Расход' : 'Expense'}
          </button>
          <button 
            type="button"
            onClick={() => {
              setType('income');
              const firstCat = categories.find((c: any) => c.type === 'income');
              if (firstCat) setCategoryId(firstCat.id);
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
              type === 'income' 
                ? 'text-emerald-400 border-emerald-500' 
                : 'text-neutral-400 border-transparent hover:text-neutral-200'
            }`}
          >
            {lang === 'ru' ? 'Доход' : 'Income'}
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto compact-scrollbar">
          
          {/* Requirement 2: Hero Amount Input at the top with autofocus & Enter save */}
          <div className="p-4 sm:p-5 bg-[#0d1117]/80 border-b border-[#30363d]/60 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-400">
                {type === 'expense' ? (lang === 'ru' ? 'Сумма расхода' : 'Expense amount') : (lang === 'ru' ? 'Сумма дохода' : 'Income amount')}
              </label>
              <span className="text-[11px] text-neutral-400 hidden sm:inline">
                {lang === 'ru' ? 'Enter — сохранить' : 'Press Enter to save'}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3 pt-1">
              <div className="flex items-baseline flex-1 min-w-0">
                <input 
                  type="text" 
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={e => {
                    const val = e.target.value.replace(/,/g, '.');
                    if (/^\d*\.?\d*$/.test(val)) {
                      setAmount(val);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="bg-transparent text-left text-4xl sm:text-5xl font-bold font-mono tracking-tight text-white outline-none w-full placeholder:text-neutral-700"
                />
              </div>
              <span className="text-3xl sm:text-4xl font-light text-neutral-400 font-mono select-none">
                {currSymbol}
              </span>
            </div>
          </div>

          {/* Requirement 3: Quick Category Grid with full wrapped text & recent categories */}
          <div className="p-4 sm:p-5 border-b border-[#30363d]/60 bg-[#161b22]">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-neutral-200">
                  {lang === 'ru' ? 'Категория' : 'Category'}
                </span>
                <span className="text-[11px] text-neutral-400">
                  ({lang === 'ru' ? 'недавние' : 'recent'})
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setShowCatSelector(true)} 
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium flex items-center gap-1"
              >
                <span>{lang === 'ru' ? 'Все категории' : 'All categories'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Currently Selected Category Preview */}
            <div 
              onClick={() => setShowCatSelector(true)}
              className="mb-3 p-2.5 bg-[#0d1117] hover:bg-[#131922] border border-[#30363d] hover:border-emerald-500/50 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center bg-[#161b22] ${selectedCatColor} shrink-0`}>
                  <SelectedCatIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {catMeta.parentName && (
                      <span className="text-[11px] text-neutral-400 truncate max-w-[120px]">
                        {catMeta.parentName} •
                      </span>
                    )}
                    <span className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {catMeta.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 block truncate">
                    {lang === 'ru' ? 'Выбрана для этой операции' : 'Selected for this transaction'}
                  </span>
                </div>
              </div>
              <span className="text-xs text-neutral-400 group-hover:text-white px-2 py-1 rounded bg-[#161b22] border border-[#30363d] shrink-0 font-medium ml-2">
                {lang === 'ru' ? 'Изменить' : 'Change'}
              </span>
            </div>

            {/* Grid of Chips with full wrapped text (no truncation) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {quickCategories.map((cat: any) => {
                const IconComp = IconMap[cat.icon] || ShoppingBag;
                const colorClass = CATEGORY_COLORS[cat.color || 'neutral'] || CATEGORY_COLORS['neutral'];
                const isSel = categoryId === cat.id;
                
                return (
                  <button 
                    type="button"
                    key={cat.id} 
                    onClick={() => setCategoryId(cat.id)} 
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                      isSel 
                        ? 'bg-emerald-500/20 border-emerald-500/70 text-white shadow-sm ring-1 ring-emerald-500/50' 
                        : 'bg-[#0d1117] border-[#30363d] text-neutral-300 hover:text-white hover:border-[#484f58] hover:bg-[#131922]'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${colorClass}`}>
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium leading-snug break-words whitespace-normal line-clamp-2">
                      {t(cat.name)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account, Date & Note Section */}
          <div className="p-4 sm:p-5 space-y-4">
            
            {/* Account Selector Row */}
            <div>
              <label className="text-xs font-medium text-neutral-400 block mb-1.5">
                {type === 'expense' ? (lang === 'ru' ? 'Счёт списания' : 'From account') : (lang === 'ru' ? 'Счёт зачисления' : 'To account')}
              </label>
              <div 
                onClick={() => setShowAccountSelector(true)}
                className="flex items-center justify-between p-3 bg-[#0d1117] hover:bg-[#131922] border border-[#30363d] hover:border-neutral-500 rounded-xl cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black shrink-0 shadow-sm">
                    {bankInfo ? (bankInfo.logo ? <bankInfo.logo className="w-4 h-4"/> : <span className="font-bold text-xs">{bankInfo.icon}</span>) : <Wallet className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm text-neutral-200 group-hover:text-white font-medium block truncate">
                      {selectedAcc ? selectedAcc.name : (lang === 'ru' ? 'Выберите счёт' : 'Select account')}
                    </span>
                    <span className="text-[11px] text-neutral-400 truncate block">
                      {bankInfo ? `${getAccountTypeLabel(selectedAcc?.type, lang)} · ${bankInfo.name}` : getAccountTypeLabel(selectedAcc?.type, lang)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs sm:text-sm font-bold font-mono text-white">
                    {selectedAcc ? formatMoney(selectedAcc.balance, currency, lang) : ''}
                  </span>
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
                </div>
              </div>
            </div>

            {/* Date Selector Row */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-neutral-400">
                  {lang === 'ru' ? 'Дата операции' : 'Date'}
                </label>
                <span className="text-xs text-neutral-400 font-medium">
                  {formatDateDisplay(date)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input 
                    type="date" 
                    value={date}
                    onChange={e => {
                      if (e.target.value) setDate(e.target.value);
                    }}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-emerald-500 transition-colors"
                    aria-label={lang === 'ru' ? 'Выбрать дату' : 'Select date'}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setDate(todayStr)}
                  className={`text-xs px-3 py-2 rounded-xl border transition-all shrink-0 ${
                    date === todayStr 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold' 
                      : 'bg-[#0d1117] text-neutral-400 border-[#30363d] hover:text-white hover:border-neutral-500'
                  }`}
                >
                  {lang === 'ru' ? 'Сегодня' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setDate(yesterdayStr)}
                  className={`text-xs px-3 py-2 rounded-xl border transition-all shrink-0 ${
                    date === yesterdayStr 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold' 
                      : 'bg-[#0d1117] text-neutral-400 border-[#30363d] hover:text-white hover:border-neutral-500'
                  }`}
                >
                  {lang === 'ru' ? 'Вчера' : 'Yesterday'}
                </button>
              </div>
            </div>

            {/* Note / Comment */}
            <div>
              <label className="text-xs font-medium text-neutral-400 block mb-1.5">
                {lang === 'ru' ? 'Комментарий' : 'Comment'}
              </label>
              <div className="flex items-center bg-[#0d1117] border border-[#30363d] focus-within:border-emerald-500 rounded-xl px-3 py-2 transition-colors">
                <MessageSquare className="w-4 h-4 text-neutral-500 mr-2.5 shrink-0" />
                <input 
                  type="text" 
                  placeholder={lang === 'ru' ? 'Например: Обед с коллегами, бензин...' : 'e.g. Lunch with team, groceries...'}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="bg-transparent border-none outline-none text-xs sm:text-sm text-white w-full placeholder:text-neutral-500"
                />
              </div>
            </div>

          </div>

          {/* Requirement 4: Collapsible "Дополнительно" block */}
          <div className="border-t border-[#30363d]/60 bg-[#0d1117]/40">
            <button
              type="button"
              onClick={() => setIsExtraOpen(!isExtraOpen)}
              className="w-full px-4 sm:px-5 py-3 flex items-center justify-between text-neutral-300 hover:text-white transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-[#161b22] border border-[#30363d] flex items-center justify-center text-neutral-400 group-hover:text-emerald-400 transition-colors">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-neutral-300 group-hover:text-white transition-colors">
                  {lang === 'ru' ? 'Дополнительно' : 'Additional options'}
                </span>
                {(skipBalanceUpdate || isRecurring) && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    {[skipBalanceUpdate && (lang === 'ru' ? 'Без списания' : 'No balance update'), isRecurring && (lang === 'ru' ? 'Повтор' : 'Recurring')].filter(Boolean).join(' • ')}
                  </span>
                )}
              </div>
              <div className="text-neutral-400 group-hover:text-white transition-colors">
                {isExtraOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            <AnimatePresence>
              {isExtraOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden px-4 sm:px-5 pb-4 space-y-4 pt-1"
                >
                  {/* Skip Balance Update Toggle */}
                  <div 
                    className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl flex items-center justify-between cursor-pointer select-none"
                    onClick={() => setSkipBalanceUpdate(!skipBalanceUpdate)}
                  >
                    <div className="flex items-center gap-2.5 pr-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                        skipBalanceUpdate ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400' : 'bg-[#0d1117] border border-[#30363d] text-neutral-400'
                      }`}>
                        <History className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium text-neutral-200">
                            {lang === 'ru' ? 'Не менять баланс счёта' : 'Do not change account balance'}
                          </span>
                          {skipBalanceUpdate && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                              {lang === 'ru' ? 'Архив / История' : 'History only'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {lang === 'ru' ? 'Деньги уже учтены на счёте; нужно только для аналитики и истории' : 'Already counted in balance; only for analytics & history'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={skipBalanceUpdate}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSkipBalanceUpdate(!skipBalanceUpdate);
                      }}
                      className={`w-11 h-6 rounded-full transition-colors relative border shrink-0 ${
                        skipBalanceUpdate ? 'bg-amber-500 border-amber-400' : 'bg-[#0d1117] border-[#30363d]'
                      }`}
                    >
                      <motion.div 
                        layout
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className={`w-4 h-4 rounded-full absolute top-0.5 shadow-md ${
                          skipBalanceUpdate ? 'bg-black right-1' : 'bg-neutral-400 left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Recurring Operation Toggle */}
                  <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl flex flex-col gap-3">
                    <div 
                      className="flex items-center justify-between cursor-pointer select-none"
                      onClick={() => setIsRecurring(!isRecurring)}
                    >
                      <div className="flex items-center gap-2.5 pr-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                          isRecurring ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' : 'bg-[#0d1117] border border-[#30363d] text-neutral-400'
                        }`}>
                          <Repeat className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-medium text-neutral-200 block">
                            {lang === 'ru' ? 'Повторять операцию' : 'Make recurring'}
                          </span>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            {lang === 'ru' ? 'Добавить в регулярные платежи для финансового прогноза' : 'Add to recurring schedule for financial forecasting'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={isRecurring}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRecurring(!isRecurring);
                        }}
                        className={`w-11 h-6 rounded-full transition-colors relative border shrink-0 ${
                          isRecurring ? 'bg-emerald-500 border-emerald-400' : 'bg-[#0d1117] border-[#30363d]'
                        }`}
                      >
                        <motion.div 
                          layout
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className={`w-4 h-4 rounded-full absolute top-0.5 shadow-md ${
                            isRecurring ? 'bg-black right-1' : 'bg-neutral-400 left-1'
                          }`}
                        />
                      </button>
                    </div>

                    {isRecurring && (
                      <div className="pt-2 border-t border-[#30363d]/60 flex flex-col gap-1.5">
                        <span className="text-[11px] font-medium text-neutral-400">
                          {lang === 'ru' ? 'Периодичность:' : 'Frequency:'}
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'weekly', label: lang === 'ru' ? 'Еженедельно' : 'Weekly' },
                            { id: 'monthly', label: lang === 'ru' ? 'Ежемесячно' : 'Monthly' },
                            { id: 'yearly', label: lang === 'ru' ? 'Ежегодно' : 'Yearly' },
                          ].map(freq => (
                            <button
                              key={freq.id}
                              type="button"
                              onClick={() => setRecurrence(freq.id as Recurrence)}
                              className={`py-1.5 px-2 text-xs rounded-lg font-medium transition-all ${
                                recurrence === freq.id
                                  ? 'bg-emerald-500 text-black font-semibold shadow-sm'
                                  : 'bg-[#0d1117] text-neutral-300 border border-[#30363d] hover:bg-[#131922]'
                              }`}
                            >
                              {freq.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Requirement 5: Sticky Save button at bottom of modal */}
        <div className="sticky bottom-0 z-20 bg-[#161b22]/95 backdrop-blur-md px-4 sm:px-5 py-3 border-t border-[#30363d] flex items-center gap-2.5 mt-auto">
          <button 
            type="button" 
            onClick={cancel} 
            className="px-4 py-2.5 text-xs font-medium text-neutral-400 hover:text-white rounded-xl hover:bg-[#0d1117] transition-colors"
          >
            {lang === 'ru' ? 'Отмена' : 'Cancel'}
          </button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>
              {isNew 
                ? (lang === 'ru' ? 'Добавить операцию' : 'Add Transaction') 
                : (lang === 'ru' ? 'Сохранить изменения' : 'Save Changes')}
            </span>
          </button>
        </div>

        {/* Full Category Selector Sub-Modal */}
        <AnimatePresence>
          {showCatSelector && (
            <FullCategorySelector 
              type={type} 
              categories={categories} 
              onSelect={(id: string) => setCategoryId(id)}
              onAdd={(parentId?: string | null) => { 
                setShowCatSelector(false); 
                onAddCategory(parentId); 
              }}
              onClose={() => setShowCatSelector(false)}
              t={t}
            />
          )}
        </AnimatePresence>
        
        {/* Account Selector Sub-Modal (desktop centered) */}
        <AnimatePresence>
          {showAccountSelector && (
            <div 
              className="fixed inset-0 z-[210] flex items-center justify-center p-0 sm:p-4 safe-area-fullscreen bg-black/80 backdrop-blur-sm overflow-hidden" 
              onClick={() => setShowAccountSelector(false)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="w-full h-full sm:h-auto sm:max-h-[80vh] sm:max-w-[480px] bg-[#161b22] border-0 sm:border sm:border-[#30363d] sm:rounded-2xl shadow-2xl flex flex-col font-sans overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center px-4 h-14 border-b border-[#30363d]/60 bg-[#0d1117] shrink-0 justify-between">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowAccountSelector(false)} 
                      className="p-1.5 -ml-1 text-neutral-400 hover:text-white rounded-lg hover:bg-[#161b22] transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-base font-semibold text-white">
                      {type === 'expense' ? (lang === 'ru' ? 'Счёт списания' : 'From account') : (lang === 'ru' ? 'Счёт зачисления' : 'To account')}
                    </h2>
                  </div>
                  <button 
                    onClick={() => setShowAccountSelector(false)} 
                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#161b22] rounded-lg transition-colors hidden sm:block"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-[#30363d]/40 compact-scrollbar">
                  {accounts.map((acc: any) => {
                    const bInfo = FULL_BANKS.find(b => b.id === acc.bank);
                    const isSelected = acc.id === accountId;
                    return (
                      <div 
                        key={acc.id} 
                        onClick={() => { setAccountId(acc.id); setShowAccountSelector(false); }}
                        className={`flex items-center justify-between px-4 py-3.5 hover:bg-[#0d1117] cursor-pointer transition-colors ${isSelected ? 'bg-emerald-500/10' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black shrink-0 shadow-sm">
                            {bInfo ? (bInfo.logo ? <bInfo.logo className="w-4 h-4"/> : <span className="font-bold text-xs">{bInfo.icon}</span>) : <Wallet className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-medium text-neutral-200 block truncate">
                              {acc.name}
                            </span>
                            <span className="text-[11px] text-neutral-400 block truncate">
                              {bInfo ? `${getAccountTypeLabel(acc.type, lang)} · ${bInfo.name}` : getAccountTypeLabel(acc.type, lang)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs sm:text-sm font-bold font-mono text-white">
                            {formatMoney(acc.balance, currency, lang)}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}


export function CategoryForm({ 
  type, setType, name, setName, icon, setIcon, parentId, setParentId, color, setColor,
  categories = [], cancel, handleSubmit, t, lang = 'ru' 
}: any) {
  const availableIcons = [
    { key: 'ShoppingBag', label: 'Покупки' },
    { key: 'Coffee', label: 'Кафе' },
    { key: 'Car', label: 'Транспорт' },
    { key: 'Bus', label: 'Автобус' },
    { key: 'Home', label: 'Дом' },
    { key: 'Briefcase', label: 'Работа' },
    { key: 'Gift', label: 'Подарки' },
    { key: 'Landmark', label: 'Вклад' },
    { key: 'PiggyBank', label: 'Копилка' },
    { key: 'Activity', label: 'Инвестиции' },
    { key: 'Heart', label: 'Здоровье' },
    { key: 'Book', label: 'Учеба' },
    { key: 'Smartphone', label: 'Связь' },
    { key: 'Plane', label: 'Поездки' },
    { key: 'Flame', label: 'Топливо' },
    { key: 'Store', label: 'Магазин' },
    { key: 'Film', label: 'Кино' },
    { key: 'Music', label: 'Музыка' },
    { key: 'Box', label: 'Другое' }
  ];

  const availableColors = [
    { key: 'orange', label: 'Оранжевый', bg: 'bg-orange-500' },
    { key: 'amber', label: 'Янтарный', bg: 'bg-amber-500' },
    { key: 'blue', label: 'Синий', bg: 'bg-blue-500' },
    { key: 'sky', label: 'Голубой', bg: 'bg-sky-500' },
    { key: 'emerald', label: 'Изумрудный', bg: 'bg-emerald-500' },
    { key: 'green', label: 'Зеленый', bg: 'bg-green-500' },
    { key: 'teal', label: 'Бирюзовый', bg: 'bg-teal-500' },
    { key: 'purple', label: 'Фиолетовый', bg: 'bg-purple-500' },
    { key: 'pink', label: 'Розовый', bg: 'bg-pink-500' },
    { key: 'red', label: 'Красный', bg: 'bg-red-500' },
    { key: 'yellow', label: 'Желтый', bg: 'bg-yellow-500' },
    { key: 'neutral', label: 'Серый', bg: 'bg-neutral-500' },
  ];

  const parentOptions = categories.filter((c: Category) => c.type === type && !c.parentId);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[220] flex items-center justify-center p-4 safe-area-overlay bg-black/80 backdrop-blur-sm" 
      onClick={cancel}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="safe-area-dialog w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl p-5 flex flex-col gap-4 shadow-2xl max-h-[90vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#30363d]/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/30">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-white text-base">
              {parentId ? (lang === 'ru' ? 'Новая подкатегория' : 'New Subcategory') : (lang === 'ru' ? 'Новая категория' : 'New Category')}
            </h3>
          </div>
          <button onClick={cancel} className="text-neutral-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {setType && (
          <div className="flex rounded-xl bg-[#0d1117] p-1 border border-[#30363d]">
            <button 
              type="button" 
              onClick={() => { setType('expense'); if (setParentId) setParentId(''); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${type === 'expense' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-neutral-400'}`}
            >
              {lang === 'ru' ? 'Расход' : 'Expense'}
            </button>
            <button 
              type="button" 
              onClick={() => { setType('income'); if (setParentId) setParentId(''); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${type === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-neutral-400'}`}
            >
              {lang === 'ru' ? 'Доход' : 'Income'}
            </button>
          </div>
        )}

        {/* Parent Category Selector */}
        {setParentId && type === 'expense' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-neutral-400 font-medium flex items-center justify-between">
              <span>{lang === 'ru' ? 'Родительская категория' : 'Parent Category'}</span>
              <span className="text-[10px] text-neutral-500">{lang === 'ru' ? '(необязательно)' : '(optional)'}</span>
            </label>
            <select
              value={parentId || ''}
              onChange={e => setParentId(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-emerald-500"
            >
              <option value="">{lang === 'ru' ? '— Верхний уровень (Главная категория) —' : '— Top Level (Main Category) —'}</option>
              {parentOptions.map((p: Category) => (
                <option key={p.id} value={p.id}>
                  📁 {t(p.name)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-neutral-400 font-medium">
            {lang === 'ru' ? 'Название' : 'Name'}
          </label>
          <input 
            type="text" 
            placeholder={lang === 'ru' ? 'Например: Супермаркеты, Фастфуд, Такси...' : 'e.g. Supermarkets, Fast food, Taxi...'}
            value={name} 
            onChange={e => setName(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-emerald-500"
            autoFocus
          />
        </div>

        {/* Icon picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-neutral-400 font-medium">
            {lang === 'ru' ? 'Иконка' : 'Icon'}
          </label>
          <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto p-1.5 bg-[#0d1117] rounded-xl border border-[#30363d]">
            {availableIcons.map(ic => {
              const Comp = IconMap[ic.key] || Box;
              const isSelected = icon === ic.key;
              return (
                <button
                  key={ic.key}
                  type="button"
                  onClick={() => setIcon(ic.key)}
                  className={`p-2 rounded-lg flex flex-col items-center justify-center transition-all ${isSelected ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400 scale-105' : 'hover:bg-[#161b22] text-neutral-400'}`}
                  title={ic.label}
                >
                  <Comp className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Color picker */}
        {setColor && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-neutral-400 font-medium">
              {lang === 'ru' ? 'Цвет' : 'Color'}
            </label>
            <div className="flex items-center gap-2 overflow-x-auto p-1 bg-[#0d1117] rounded-xl border border-[#30363d]">
              {availableColors.map(col => {
                const isSelected = (color || 'neutral') === col.key;
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => setColor(col.key)}
                    className={`w-6 h-6 rounded-full shrink-0 ${col.bg} transition-all ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : 'opacity-70 hover:opacity-100'}`}
                    title={col.label}
                  />
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-[#30363d]/50">
          <button type="button" onClick={cancel} className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white">
            {lang === 'ru' ? 'Отмена' : 'Cancel'}
          </button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={!name.trim()}
            className="px-4 py-2 text-xs bg-emerald-500 disabled:opacity-50 text-black rounded-xl font-semibold hover:bg-emerald-400 transition-colors"
          >
            {lang === 'ru' ? 'Сохранить' : 'Save'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

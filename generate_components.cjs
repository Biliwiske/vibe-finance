const fs = require('fs');

const code = `
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Search, CheckCircle2, ChevronLeft, 
  Calendar, MessageSquare, QrCode, Repeat,
  ShoppingBag, Car, Home, Briefcase, Coffee, Gift, Heart, Music, Smartphone, Plane, Book, Film, Activity, Box, Plus
} from 'lucide-react';

export const FULL_BANKS = [
  { id: 'tinkoff', name: 'Т-Банк', sub: 'Россия • 27 510 человек', icon: 'T', color: 'text-black', bg: 'bg-[#ffdd2d]', logo: null },
  { id: 'sberbank', name: 'СберБанк', sub: 'Россия • 18 780 человек', icon: 'S', color: 'text-white', bg: 'bg-[#21a038]', logo: CheckCircle2 },
  { id: 'alfa', name: 'Альфа-Банк', sub: 'Россия • 14 450 человек', icon: 'A', color: 'text-white', bg: 'bg-[#ef3124]', logo: null },
  { id: 'ozon', name: 'Ozon Банк', sub: 'Россия • 10 360 человек', icon: 'O', color: 'text-white', bg: 'bg-[#005bff]', logo: null },
  { id: 'vtb', name: 'Банк ВТБ', sub: 'Россия • 9 210 человек', icon: 'V', color: 'text-white', bg: 'bg-[#0a2896]', logo: null },
  { id: 'yandex', name: 'Яндекс Банк', sub: 'Россия • 9 030 человек', icon: 'Я', color: 'text-white', bg: 'bg-[#ffcc00]', logo: null },
  { id: 'sovcom', name: 'Совкомбанк', sub: 'Россия • 2 280 человек', icon: 'C', color: 'text-white', bg: 'bg-[#ea3235]', logo: null },
  { id: 'raiffeisen', name: 'Райффайзенбанк', sub: 'Россия • 1 930 человек', icon: 'X', color: 'text-black', bg: 'bg-[#ffee00]', logo: null },
  { id: 'gazprom', name: 'Газпромбанк', sub: 'Россия • 1 870 человек', icon: 'G', color: 'text-white', bg: 'bg-[#003c96]', logo: null },
  { id: 'revolut', name: 'Revolut', sub: 'Весь мир • 1 530 человек', icon: 'R', color: 'text-black', bg: 'bg-white', logo: null },
  { id: 'none', name: 'Другой / Наличные', sub: '', icon: '💰', color: 'text-white', bg: 'bg-neutral-700', logo: null }
];

export const CATEGORY_COLORS: Record<string, string> = {
  yellow: 'text-yellow-500 border-yellow-500',
  purple: 'text-purple-500 border-purple-500',
  pink: 'text-pink-500 border-pink-500',
  red: 'text-red-500 border-red-500',
  orange: 'text-orange-500 border-orange-500',
  blue: 'text-blue-500 border-blue-500',
  teal: 'text-teal-500 border-teal-500',
  green: 'text-green-500 border-green-500',
  emerald: 'text-emerald-500 border-emerald-500',
  cyan: 'text-cyan-500 border-cyan-500',
  sky: 'text-sky-500 border-sky-500',
  neutral: 'text-neutral-400 border-neutral-400',
};

// Map string names to components
export const IconMap: Record<string, any> = {
  ShoppingBag, Car, Home, Briefcase, Coffee, Gift, Heart, Music, Smartphone, Plane, Book, Film, Activity, Box
};

export function BankSelectorModal({ onSelect, onClose }: { onSelect: (id: string) => void, onClose: () => void }) {
  const [search, setSearch] = useState('');
  
  const filtered = FULL_BANKS.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[200] bg-[#0a0a0a] flex flex-col"
    >
      <div className="flex items-center px-4 h-14 border-b border-neutral-800 shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 text-neutral-300 hover:text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-base font-medium text-white flex-1 text-center pr-8">Выберите банк</h2>
      </div>
      
      <div className="p-4 shrink-0">
        <div className="flex items-center bg-[#1c1c1e] rounded-xl px-3 py-2">
          <Search className="w-5 h-5 text-neutral-500 mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder="Поиск"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-white w-full text-base placeholder:text-neutral-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map(bank => (
          <div 
            key={bank.id} 
            onClick={() => { onSelect(bank.id); onClose(); }}
            className="flex items-center px-4 py-3 hover:bg-[#1c1c1e] cursor-pointer transition-colors"
          >
            <div className={\`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 \${bank.bg} \${bank.color}\`}>
              {bank.logo ? <bank.logo className="w-6 h-6" /> : bank.icon}
            </div>
            <div className="ml-4">
              <div className="text-white text-base">{bank.name}</div>
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
  );
}

export function FullCategorySelector({ type, categories, onSelect, onAdd, onClose }: any) {
  const [activeTab, setActiveTab] = useState(type);
  
  const filtered = categories.filter((c: any) => c.type === activeTab);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[200] bg-[#0a0a0a] flex flex-col"
    >
      <div className="flex items-center px-4 h-14 shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 text-neutral-300 hover:text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-base font-medium text-white flex-1 text-center pr-2">Выберите категорию</h2>
        <button className="p-2 -mr-2 text-neutral-300 hover:text-white">
          <Search className="w-5 h-5" />
        </button>
      </div>

      <div className="flex px-4 border-b border-neutral-800">
        <button 
          onClick={() => setActiveTab('expense')}
          className={\`flex-1 pb-3 text-sm font-medium \${activeTab === 'expense' ? 'text-white border-b-2 border-white' : 'text-neutral-500'}\`}
        >
          Расход
        </button>
        <button 
          onClick={() => setActiveTab('income')}
          className={\`flex-1 pb-3 text-sm font-medium \${activeTab === 'income' ? 'text-white border-b-2 border-white' : 'text-neutral-500'}\`}
        >
          Доход (Возврат)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm text-neutral-500 mb-4">Все категории</h3>
        <div className="grid grid-cols-4 gap-y-6 gap-x-2">
          {filtered.map((cat: any) => {
            const IconComp = IconMap[cat.icon] || ShoppingBag;
            const colorClass = CATEGORY_COLORS[cat.color || 'neutral'] || CATEGORY_COLORS['neutral'];
            return (
              <div key={cat.id} onClick={() => { onSelect(cat.id); onClose(); }} className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className={\`w-14 h-14 rounded-full border flex items-center justify-center bg-black \${colorClass} group-hover:bg-neutral-900 transition-colors\`}>
                  <IconComp className="w-6 h-6" />
                </div>
                <span className="text-xs text-center text-neutral-300 leading-tight">{cat.name}</span>
              </div>
            );
          })}
          
          <div onClick={onAdd} className="flex flex-col items-center gap-2 cursor-pointer group">
             <div className="w-14 h-14 rounded-full border border-neutral-600 flex items-center justify-center bg-neutral-900 text-neutral-400 group-hover:bg-neutral-800 transition-colors">
               <Plus className="w-6 h-6" />
             </div>
             <span className="text-xs text-center text-neutral-400">Добавить</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function NewTransactionForm({ 
  isNew, amount, setAmount, type, setType, categoryId, setCategoryId, 
  accountId, setAccountId, date, setDate, note, setNote, 
  categories, accounts, cancel, handleSubmit, t, currency, lang, onAddCategory 
}: any) {
  
  const [showCatSelector, setShowCatSelector] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  
  const isIncome = type === 'income';
  
  const selectedCat = categories.find((c:any) => c.id === categoryId);
  const selectedAcc = accounts.find((a:any) => a.id === accountId);
  const bankInfo = selectedAcc ? FULL_BANKS.find(b => b.id === selectedAcc.bank) : null;

  const quickCategories = categories.filter((c:any) => c.type === type).slice(0, 4);

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[150] bg-[#0a0a0a] flex flex-col font-sans"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0">
        <button onClick={cancel} className="p-2 -ml-2 text-neutral-300 hover:text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button onClick={handleSubmit} className="text-[#3282f6] font-medium text-base">
          Сохранить
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-4 mt-2">
        {['expense', 'income', 'transfer', 'debt'].map(tab => (
          <button 
            key={tab}
            onClick={() => (tab === 'expense' || tab === 'income') && setType(tab)}
            className={\`flex-1 pb-3 text-sm font-medium transition-colors \${
              (type === 'expense' && tab === 'expense') || (type === 'income' && tab === 'income') 
              ? 'text-white border-b border-white' 
              : 'text-neutral-500'
            }\`}
          >
            {tab === 'expense' ? 'Расход' : tab === 'income' ? 'Доход' : tab === 'transfer' ? 'Перевод' : 'Долг'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Amount */}
        <div className="px-4 py-8 flex justify-between items-end border-b border-neutral-900">
           <div className="text-neutral-500 text-3xl">
             <span className="opacity-0">T</span> {/* Spacer for visual balance if needed */}
           </div>
           <div className="flex items-end">
             <input 
               type="text" 
               inputMode="decimal"
               placeholder="0"
               value={amount}
               onChange={e => setAmount(e.target.value)}
               className="bg-transparent text-right text-5xl font-light text-white outline-none w-full max-w-[250px]"
             />
             <span className="text-4xl font-light text-neutral-400 ml-2 mb-0.5">₽</span>
           </div>
        </div>

        {/* Quick Categories */}
        <div className="px-4 py-6 border-b border-neutral-900">
          <div className="flex justify-between items-start gap-2">
            {quickCategories.map((cat: any) => {
              const IconComp = IconMap[cat.icon] || ShoppingBag;
              const colorClass = CATEGORY_COLORS[cat.color || 'neutral'] || CATEGORY_COLORS['neutral'];
              const isSel = categoryId === cat.id;
              
              return (
                <div key={cat.id} onClick={() => setCategoryId(cat.id)} className="flex flex-col items-center gap-2 cursor-pointer flex-1">
                  <div className={\`w-14 h-14 rounded-full flex items-center justify-center transition-all
                    \${isSel ? 'bg-neutral-800' : 'bg-black'} 
                    border \${colorClass}
                  \`}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-center text-neutral-300 leading-tight w-16 truncate">{cat.name}</span>
                </div>
              );
            })}
            
            <div onClick={() => setShowCatSelector(true)} className="flex flex-col items-center gap-2 cursor-pointer flex-1">
               <div className="w-14 h-14 rounded-full border border-neutral-700 flex items-center justify-center bg-neutral-900 text-neutral-400">
                 <span className="text-lg leading-none mt-[-6px]">...</span>
               </div>
               <span className="text-xs text-center text-neutral-400">Ещё</span>
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="px-4">
          
          {/* Account */}
          <div className="flex items-center justify-between py-4 border-b border-neutral-900 cursor-pointer" onClick={() => setShowAccountSelector(true)}>
             <div className="flex items-center gap-3">
               <div className="w-6 h-6 bg-white rounded flex items-center justify-center text-black">
                 {bankInfo ? (bankInfo.logo ? <bankInfo.logo className="w-4 h-4"/> : <span className="font-bold text-xs">{bankInfo.icon}</span>) : <Wallet className="w-4 h-4" />}
               </div>
               <span className="text-base text-neutral-200">{selectedAcc ? selectedAcc.name : 'Выберите счет'}</span>
             </div>
             <div className="text-base text-white">
               {selectedAcc ? formatMoney(selectedAcc.balance, 'RUB', 'ru') : ''}
             </div>
          </div>

          {/* Date */}
          <div className="flex items-center justify-between py-4 border-b border-neutral-900 cursor-pointer">
             <div className="flex items-center gap-3">
               <Calendar className="w-5 h-5 text-neutral-400" />
               <span className="text-base text-neutral-200">Сегодня</span>
             </div>
             <div className="text-base text-neutral-500">
               Вчера
             </div>
          </div>

          {/* Note */}
          <div className="flex items-center py-4 border-b border-neutral-900">
             <MessageSquare className="w-5 h-5 text-neutral-400 mr-3" />
             <input 
               type="text" 
               placeholder="Комментарий"
               value={note}
               onChange={e => setNote(e.target.value)}
               className="bg-transparent border-none outline-none text-base text-white w-full placeholder:text-neutral-500"
             />
          </div>

          {/* QR */}
          <div className="flex items-center py-4 border-b border-neutral-900 cursor-pointer">
             <QrCode className="w-5 h-5 text-neutral-400 mr-3" />
             <span className="text-base text-neutral-200">Сканировать QR-код чека</span>
          </div>

          {/* Repeat */}
          <div className="flex items-center justify-between py-4 border-b border-neutral-900 cursor-pointer">
             <span className="text-base text-neutral-200">Повторять операцию</span>
             <div className="w-12 h-6 bg-neutral-800 rounded-full border border-neutral-700 relative">
               <div className="w-5 h-5 bg-neutral-500 rounded-full absolute left-0.5 top-0.5"></div>
             </div>
          </div>

        </div>
      </div>

      <AnimatePresence>
        {showCatSelector && (
          <FullCategorySelector 
            type={type} 
            categories={categories} 
            onSelect={(id: string) => setCategoryId(id)}
            onAdd={() => { setShowCatSelector(false); onAddCategory(); }}
            onClose={() => setShowCatSelector(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Account Selector (simplified inline for now or modal) */}
      <AnimatePresence>
        {showAccountSelector && (
           <motion.div 
             initial={{ opacity: 0, y: '100%' }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: '100%' }}
             className="fixed inset-0 z-[200] bg-[#0a0a0a] flex flex-col"
           >
             <div className="flex items-center px-4 h-14 border-b border-neutral-800 shrink-0">
               <button onClick={() => setShowAccountSelector(false)} className="p-2 -ml-2 text-neutral-300 hover:text-white">
                 <ChevronLeft className="w-6 h-6" />
               </button>
               <h2 className="text-base font-medium text-white flex-1 text-center pr-8">Счет списания</h2>
             </div>
             <div className="flex-1 overflow-y-auto">
                {accounts.map((acc: any) => {
                  const bInfo = FULL_BANKS.find(b => b.id === acc.bank);
                  return (
                    <div 
                      key={acc.id} 
                      onClick={() => { setAccountId(acc.id); setShowAccountSelector(false); }}
                      className="flex items-center justify-between px-4 py-4 border-b border-neutral-800 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black">
                          {bInfo ? (bInfo.logo ? <bInfo.logo className="w-5 h-5"/> : <span className="font-bold text-sm">{bInfo.icon}</span>) : <Wallet className="w-5 h-5" />}
                        </div>
                        <span className="text-base text-neutral-200">{acc.name}</span>
                      </div>
                      <div className="text-base text-white">
                        {formatMoney(acc.balance, currency, lang)}
                      </div>
                    </div>
                  );
                })}
             </div>
           </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
`

// Just making sure to dump this to a file first. We will integrate it later.
fs.writeFileSync('src/TransactionForms.tsx', code);

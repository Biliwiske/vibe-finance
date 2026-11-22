const fs = require('fs');
const targetContent = fs.readFileSync('app_return.txt', 'utf8');

const replacement = `  return (
    <div className="flex h-screen w-full bg-[#0d1117] text-neutral-200 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-[#30363d] shrink-0">
          <Calculator className="w-6 h-6 text-emerald-400" />
          <h1 className="text-xl font-semibold tracking-tight text-white">{t('app_title')}</h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 compact-scrollbar">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors \${activeTab === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400' : 'text-neutral-400 hover:bg-[#30363d]/30 hover:text-neutral-200'}\`}
          >
            <LayoutDashboard className="w-4 h-4" />
            {t('nav_overview')}
          </button>
          
          <button 
            onClick={() => setActiveTab('accounts')}
            className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors \${activeTab === 'accounts' ? 'bg-emerald-500/10 text-emerald-400' : 'text-neutral-400 hover:bg-[#30363d]/30 hover:text-neutral-200'}\`}
          >
            <PiggyBank className="w-4 h-4" />
            {t('nav_accounts')}
          </button>
          
          <button 
            onClick={() => setActiveTab('purchases')}
            className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors \${activeTab === 'purchases' ? 'bg-emerald-500/10 text-emerald-400' : 'text-neutral-400 hover:bg-[#30363d]/30 hover:text-neutral-200'}\`}
          >
            <ShoppingBag className="w-4 h-4" />
            {t('nav_purchases')}
          </button>
          
          <button 
            onClick={() => setActiveTab('payments')}
            className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors \${activeTab === 'payments' ? 'bg-emerald-500/10 text-emerald-400' : 'text-neutral-400 hover:bg-[#30363d]/30 hover:text-neutral-200'}\`}
          >
            <CalendarDays className="w-4 h-4" />
            {t('nav_payments')}
          </button>
        </nav>

        <div className="p-4 border-t border-[#30363d] flex flex-col gap-3 shrink-0">
          <button 
            onClick={handleExportCSV}
            className="w-full px-3 py-2 flex items-center justify-center gap-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm font-medium text-neutral-300 hover:text-white hover:border-emerald-500/50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{t('export_csv')}</span>
          </button>
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
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8 min-h-0 flex flex-col gap-6 bg-[#0d1117] relative">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6 max-w-6xl w-full mx-auto"
            >
               <PaymentNotifications payments={payments} accounts={accounts} t={t} currency={currency} lang={language} />
               <motion.section 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="flex overflow-x-auto divide-x divide-[#30363d] border border-[#30363d] rounded-xl bg-[#161b22] shrink-0 compact-scrollbar"
               >
                 <DashboardCard title={t('total_balance')} amount={totalBalance} currency={currency} lang={language} icon={<Wallet className="w-4 h-4" />} />
                 <DashboardCard title={t('capital_after_purchases')} amount={capitalAfterPurchases} currency={currency} lang={language} icon={<ShoppingBag className="w-4 h-4" />} />
                 <DashboardCard title={t('monthly_income')} amount={totalIncome} currency={currency} lang={language} icon={<Briefcase className="w-4 h-4" />} subtitle={t('income_desc')} />
                 <DashboardCard title={t('obligations')} amount={totalObligations} currency={currency} lang={language} icon={<CalendarDays className="w-4 h-4" />} isNegative />
                 <DashboardCard title={t('monthly_free_cash')} amount={freeCashFlow} currency={currency} lang={language} icon={<TrendingUp className="w-4 h-4" />} subtitle={t('free_cash_desc')} isHighlight isNegative={freeCashFlow < 0} />
               </motion.section>
               <AnalyticsManager accounts={accounts} payments={displayPayments} salary={salary} goals={goals} purchases={purchases} t={t} currency={currency} lang={language} />
            </motion.div>
          )}
          
          {activeTab === 'accounts' && (
            <motion.div 
              key="accounts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col xl:flex-row gap-6 max-w-6xl w-full mx-auto"
            >
              <div className="flex-1 flex flex-col gap-6">
                <AccountManager 
                  accounts={accounts} 
                  onAdd={addAccount} 
                  onEdit={editAccount} 
                  onRemove={removeAccount} 
                  salary={salary}
                  setSalary={setSalary}
                  t={t} 
                  currency={currency} 
                  lang={language} 
                />
              </div>
              <div className="flex-1 flex flex-col gap-6">
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
              </div>
            </motion.div>
          )}
          
          {activeTab === 'purchases' && (
             <motion.div 
              key="purchases"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6 max-w-4xl w-full mx-auto"
             >
                <PurchaseManager
                  purchases={purchases || []}
                  onAdd={addPurchase}
                  onEdit={editPurchase}
                  onRemove={removePurchase}
                  t={t}
                  currency={currency}
                  lang={language}
                />
             </motion.div>
          )}

          {activeTab === 'payments' && (
             <motion.div 
              key="payments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6 max-w-4xl w-full mx-auto"
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
        </AnimatePresence>
      </main>
    </div>
  );
}
`;

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');
appTsx = appTsx.replace(targetContent, replacement);
fs.writeFileSync('src/App.tsx', appTsx);

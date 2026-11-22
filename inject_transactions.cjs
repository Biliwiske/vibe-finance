const fs = require('fs');

const txComp = fs.readFileSync('transaction_components.tsx', 'utf8');
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

appTsx = appTsx.replace(
  "export default function App() {",
  txComp + "\nexport default function App() {"
);

// Add transactions state extraction from useFinanceStore
appTsx = appTsx.replace(
  "purchases,\n    addAccount,",
  "purchases, transactions, categories,\n    addAccount,"
);
appTsx = appTsx.replace(
  "removePurchase\n  } = useFinanceStore();",
  "removePurchase,\n    addTransaction, removeTransaction, addCategory\n  } = useFinanceStore();"
);

// Add navigation button
const navPaymentBtn = `          <button 
            onClick={() => setActiveTab('payments')}
            className={\`flex-none md:w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors \${activeTab === 'payments' ? 'bg-emerald-500/10 text-emerald-400' : 'text-neutral-400 hover:bg-[#30363d]/30 hover:text-neutral-200'}\`}
          >
            <CalendarDays className="w-4 h-4" />
            {t('nav_payments')}
          </button>`;

const navTxBtn = `          <button 
            onClick={() => setActiveTab('transactions')}
            className={\`flex-none md:w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors \${activeTab === 'transactions' ? 'bg-emerald-500/10 text-emerald-400' : 'text-neutral-400 hover:bg-[#30363d]/30 hover:text-neutral-200'}\`}
          >
            <Repeat className="w-4 h-4" />
            {t('nav_transactions') || 'Transactions'}
          </button>`;

appTsx = appTsx.replace(navPaymentBtn, navPaymentBtn + "\n" + navTxBtn);

// activeTab type needs 'transactions'
appTsx = appTsx.replace(
  "useState<'dashboard' | 'accounts' | 'purchases' | 'payments'>('dashboard')",
  "useState<'dashboard' | 'accounts' | 'purchases' | 'payments' | 'transactions'>('dashboard')"
);

// Add transactions Tab Content
const paymentsTab = `{activeTab === 'payments' && (
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
          )}`;

const txTab = `          {activeTab === 'transactions' && (
             <motion.div 
              key="transactions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6 max-w-4xl w-full mx-auto"
             >
                <TransactionManager 
                  transactions={transactions}
                  categories={categories}
                  accounts={accounts}
                  onAdd={addTransaction}
                  onRemove={removeTransaction}
                  onAddCategory={addCategory}
                  t={t}
                  currency={currency}
                  lang={language}
                />
             </motion.div>
          )}`;

appTsx = appTsx.replace(paymentsTab, paymentsTab + "\n" + txTab);

// Save
fs.writeFileSync('src/App.tsx', appTsx);

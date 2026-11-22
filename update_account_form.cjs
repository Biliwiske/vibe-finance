const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

// replace the inline bank selector with a button that opens the modal
// also need to import BankSelectorModal and FULL_BANKS

app = app.replace(
  "import { NewTransactionForm as TransactionForm, CategoryForm } from './TransactionForms';",
  "import { NewTransactionForm as TransactionForm, CategoryForm, BankSelectorModal, FULL_BANKS } from './TransactionForms';"
);

// We need to inject useState to AccountForm if it doesn't have it, but wait, AccountForm is a functional component, we can use React.useState
const newAccountFormStart = `function AccountForm({ 
  isNew, name, setName, balance, setBalance, type, setType, interestRate, setInterestRate, bank, setBank, cancel, handleSubmit, onRemove, t 
}: any) {
  const [showBankSelector, setShowBankSelector] = React.useState(false);
  const selectedBankInfo = FULL_BANKS.find(b => b.id === bank);
`;

app = app.replace(
  "function AccountForm({ \n  isNew, name, setName, balance, setBalance, type, setType, interestRate, setInterestRate, bank, setBank, cancel, handleSubmit, onRemove, t \n}: any) {",
  newAccountFormStart
);

const oldBankSelector = `{/* Bank Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-neutral-400 px-1">{t('select_bank') || 'Select Bank'}</label>
          <div className="flex overflow-x-auto gap-2 pb-2 compact-scrollbar">
            {BANKS.map(b => {
              const Icon = b.icon;
              const isSelected = bank === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBank(b.id)}
                  className={\`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors shrink-0 \${isSelected ? 'border-emerald-500/50 bg-[#161b22]' : 'border-[#30363d] bg-[#0d1117] hover:border-neutral-500'}\`}
                >
                  <div className={\`p-1.5 rounded-lg \${b.bg}\`}>
                    <Icon className={\`w-3.5 h-3.5 \${b.color}\`} />
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap">{b.name}</span>
                </button>
              )
            })}
          </div>
        </div>`;
        
const newBankSelector = `{/* Bank Selector */}
        <button 
          type="button" 
          onClick={() => setShowBankSelector(true)}
          className="flex items-center justify-between bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 hover:border-neutral-500 transition-colors"
        >
          <div className="flex items-center gap-3">
            {selectedBankInfo ? (
              <>
                <div className={\`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold \${selectedBankInfo.bg} \${selectedBankInfo.color}\`}>
                  {selectedBankInfo.logo ? <selectedBankInfo.logo className="w-5 h-5"/> : selectedBankInfo.icon}
                </div>
                <span className="text-neutral-200 font-medium">{selectedBankInfo.name}</span>
              </>
            ) : (
              <span className="text-neutral-500">Выберите банк</span>
            )}
          </div>
          <span className="text-neutral-400 text-sm">Изменить</span>
        </button>
        
        {showBankSelector && (
          <BankSelectorModal onSelect={setBank} onClose={() => setShowBankSelector(false)} />
        )}
`;

app = app.replace(oldBankSelector, newBankSelector);

fs.writeFileSync('src/App.tsx', app);

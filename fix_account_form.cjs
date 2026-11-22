const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

const BANKS_CONST = `
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
`;

appTsx = appTsx.replace("function AccountForm", BANKS_CONST + "\nfunction AccountForm");

const formTopStr = `function AccountForm({ 
  isNew, name, setName, balance, setBalance, type, setType, interestRate, setInterestRate, bank, setBank, cancel, handleSubmit, onRemove, t 
}: any) {
  return (
    <Modal title={isNew ? t('add_acc') : t('edit_acc')} onClose={cancel}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input 
          type="text" 
          placeholder={t('acc_name')}
          value={name} 
          onChange={e => setName(e.target.value)}
          className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 text-neutral-200"
        />
        
        {/* Bank Selector */}
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
        </div>
`;

// Replace everything inside AccountForm until `<div className="grid grid-cols-2 gap-3">`
const startIdx = appTsx.indexOf("function AccountForm({");
const endIdx = appTsx.indexOf('<div className="grid grid-cols-2 gap-3">', startIdx);
if (startIdx !== -1 && endIdx !== -1) {
  appTsx = appTsx.substring(0, startIdx) + formTopStr + appTsx.substring(endIdx);
}

fs.writeFileSync('src/App.tsx', appTsx);

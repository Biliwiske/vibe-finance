const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

const oldAccountFormStart = "function AccountForm({ isNew, name, setName, balance, setBalance, type, setType, interestRate, setInterestRate, cancel, handleSubmit, onRemove, t }: any) {";
const oldAccountFormEnd = "function AccountManager({ accounts, onAdd, onEdit, onRemove, salary, setSalary, t, currency, lang }: any) {";

// extract the block between these two to replace it.
const regex = new RegExp(
  oldAccountFormStart.replace(/[.*+?^$\{()|\[\]\\]/g, '\\$&') + '[\\s\\S]*?' + 
  oldAccountFormEnd.replace(/[.*+?^$\{()|\[\]\\]/g, '\\$&')
);

const newAccountForm = `
const BANKS = [
  { id: 'none', name: 'Other / Cash', icon: Landmark, color: 'text-neutral-400', bg: 'bg-[#0d1117]' },
  { id: 'chase', name: 'Chase', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'bofa', name: 'Bank of America', icon: Building2, color: 'text-red-500', bg: 'bg-red-500/10' },
  { id: 'wellsfargo', name: 'Wells Fargo', icon: Building2, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { id: 'sberbank', name: 'Sberbank', icon: Landmark, color: 'text-green-500', bg: 'bg-green-500/10' },
  { id: 'tinkoff', name: 'T-Bank', icon: Landmark, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { id: 'alfa', name: 'Alfa-Bank', icon: Landmark, color: 'text-red-600', bg: 'bg-red-600/10' },
  { id: 'revolut', name: 'Revolut', icon: Building2, color: 'text-white', bg: 'bg-white/10' }
];

function AccountForm({ isNew, name, setName, balance, setBalance, type, setType, interestRate, setInterestRate, bank, setBank, cancel, handleSubmit, onRemove, t }: any) {
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

        <div className="grid grid-cols-2 gap-3">
          <input 
            type="number" 
            step="0.01"
            placeholder={t('acc_balance')}
            value={balance} 
            onChange={e => setBalance(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 w-full text-neutral-200"
          />
          <select 
            value={type} 
            onChange={e => setType(e.target.value as AccountType)}
            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors text-neutral-300 w-full appearance-none"
          >
            <option value="checking">{t('type_checking')}</option>
            <option value="savings">{t('type_savings')}</option>
            <option value="deposit">{t('type_deposit')}</option>
            <option value="cash">{t('type_cash')}</option>
            <option value="crypto">{t('type_crypto')}</option>
            <option value="debt">{t('type_debt')}</option>
          </select>
        </div>
        {type !== 'cash' && (
          <div className="relative">
            <input
              type="number"
              step="0.1"
              placeholder={t('interest_rate')}
              value={interestRate}
              onChange={e => setInterestRate(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 w-full pl-10 text-neutral-200"
            />
            <Percent className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
        )}
        <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-[#30363d]/50">
          {!isNew && (
            <button type="button" onClick={onRemove} className="px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors mr-auto flex items-center gap-1.5"><Trash2 className="w-4 h-4"/> {t('cancel') === 'Cancel' ? 'Delete' : 'Удалить'}</button>
          )}
          <button type="button" onClick={cancel} className="px-4 py-2.5 text-sm font-medium text-neutral-400 hover:text-white bg-[#0d1117] border border-[#30363d] rounded-xl transition-colors">{t('cancel')}</button>
          <button type="submit" className="px-4 py-2.5 text-sm font-medium bg-emerald-500 text-neutral-950 rounded-xl hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">{t('save_acc')}</button>
        </div>
      </form>
    </Modal>
  );
}

function AccountManager({ accounts, onAdd, onEdit, onRemove, salary, setSalary, t, currency, lang }: any) {
`;

appTsx = appTsx.replace(regex, newAccountForm);

// Need to update imports to add Building2 and others if needed
if (!appTsx.includes('Building2')) {
  appTsx = appTsx.replace(
    "import { Plus",
    "import { Plus, Building2, Tag, ArrowUpCircle, ArrowDownCircle, Search"
  );
}

fs.writeFileSync('src/App.tsx', appTsx);

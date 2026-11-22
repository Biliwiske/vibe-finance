const fs = require('fs');

const transactionComponents = `
function TransactionForm({ isNew, amount, setAmount, type, setType, categoryId, setCategoryId, accountId, setAccountId, date, setDate, note, setNote, categories, accounts, cancel, handleSubmit, onRemove, t, currency, lang, onAddCategory }: any) {
  const isIncome = type === 'income';
  
  return (
    <Modal title={isNew ? t('add_transaction') : t('edit_transaction')} onClose={cancel}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Type Toggle */}
        <div className="flex bg-[#0d1117] border border-[#30363d] rounded-xl p-1">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={\`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors \${!isIncome ? 'bg-red-500/10 text-red-400' : 'text-neutral-500 hover:text-neutral-300'}\`}
          >
            {t('expense')}
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={\`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors \${isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'}\`}
          >
            {t('income')}
          </button>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-2 gap-3">
          <input 
            type="number" 
            step="0.01"
            placeholder={t('acc_balance')}
            value={amount} 
            onChange={e => setAmount(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 w-full text-neutral-200"
            required
          />
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors text-neutral-300 w-full"
            style={{ colorScheme: 'dark' }}
            required
          />
        </div>

        {/* Category & Account */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select 
            value={categoryId} 
            onChange={e => {
              if (e.target.value === 'new') {
                onAddCategory();
              } else {
                setCategoryId(e.target.value);
              }
            }}
            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors text-neutral-300 w-full appearance-none"
            required
          >
            <option value="" disabled>{t('category')}</option>
            {categories.filter((c: any) => c.type === type).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value="new">+ {t('add_category')}</option>
          </select>

          <select 
            value={accountId} 
            onChange={e => setAccountId(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors text-neutral-300 w-full appearance-none"
            required
          >
            <option value="" disabled>{t('acc_title')}</option>
            {accounts.map((a: any) => (
              <option key={a.id} value={a.id}>{a.name} ({formatMoney(a.balance, currency, lang)})</option>
            ))}
          </select>
        </div>

        {/* Note */}
        <input 
          type="text" 
          placeholder={t('note')}
          value={note} 
          onChange={e => setNote(e.target.value)}
          className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 text-neutral-200"
        />

        <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-[#30363d]/50">
          {!isNew && (
            <button type="button" onClick={onRemove} className="px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors mr-auto flex items-center gap-1.5"><Trash2 className="w-4 h-4"/> {t('cancel') === 'Cancel' ? 'Delete' : 'Удалить'}</button>
          )}
          <button type="button" onClick={cancel} className="px-4 py-2.5 text-sm font-medium text-neutral-400 hover:text-white bg-[#0d1117] border border-[#30363d] rounded-xl transition-colors">{t('cancel')}</button>
          <button type="submit" className="px-4 py-2.5 text-sm font-medium bg-emerald-500 text-neutral-950 rounded-xl hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">{isNew ? (t('cancel') === 'Cancel' ? 'Add' : 'Добавить') : t('save_acc')}</button>
        </div>
      </form>
    </Modal>
  );
}

function CategoryForm({ type, name, setName, icon, setIcon, cancel, handleSubmit, t }: any) {
  const AVAILABLE_ICONS = ['ShoppingBag', 'Car', 'Home', 'Briefcase', 'Coffee', 'Gift', 'Heart', 'Music', 'Smartphone', 'Plane', 'Book', 'Film', 'Activity', 'Box'];
  
  return (
    <Modal title={t('add_category')} onClose={cancel}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input 
          type="text" 
          placeholder={t('category')}
          value={name} 
          onChange={e => setName(e.target.value)}
          className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-600 text-neutral-200"
          required
        />
        
        <div className="grid grid-cols-7 gap-2 max-h-[150px] overflow-y-auto compact-scrollbar p-1">
          {AVAILABLE_ICONS.map(i => {
            const isSelected = icon === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={\`flex items-center justify-center p-2 rounded-lg border transition-colors \${isSelected ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-[#30363d] bg-[#161b22] hover:border-neutral-500 text-neutral-400'}\`}
              >
                {/* Dynamically render icon - simple fallback since we can't dynamically import easily without a map, we'll use a hack or just text */}
                <span className="text-xs">{i.substring(0, 3)}</span>
              </button>
            )
          })}
        </div>

        <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-[#30363d]/50">
          <button type="button" onClick={cancel} className="px-4 py-2.5 text-sm font-medium text-neutral-400 hover:text-white bg-[#0d1117] border border-[#30363d] rounded-xl transition-colors">{t('cancel')}</button>
          <button type="submit" className="px-4 py-2.5 text-sm font-medium bg-emerald-500 text-neutral-950 rounded-xl hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">{t('cancel') === 'Cancel' ? 'Add' : 'Добавить'}</button>
        </div>
      </form>
    </Modal>
  );
}

function TransactionManager({ transactions, categories, accounts, onAdd, onEdit, onRemove, onAddCategory, t, currency, lang }: any) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  
  // Transaction form state
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // Category form state
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('ShoppingBag');

  const startAdding = () => {
    if (accounts.length === 0) {
      alert("Please add an account first");
      return;
    }
    setEditingId('new');
    setAmount('');
    setType('expense');
    setCategoryId('');
    setAccountId(accounts[0].id);
    setDate(new Date().toISOString().split('T')[0]);
    setNote('');
  };

  const cancel = () => {
    setEditingId(null);
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!amount || !categoryId || !accountId || !date) return;
    
    const data = {
      amount: parseFloat(amount),
      type,
      categoryId,
      accountId,
      date,
      note
    };

    if (editingId === 'new') {
      onAdd(data);
    } else if (editingId) {
      // For editing, we might need a more complex store method to revert old balance and apply new.
      // Assuming onRemove and onAdd works for now, or just don't allow edit balance.
      // But let's just use onRemove + onAdd for simplicity in edit to handle balance properly.
      onRemove(editingId);
      onAdd(data);
    }
    setEditingId(null);
  };

  const handleAddCategorySubmit = (e: any) => {
    e.preventDefault();
    if (!catName || !catIcon) return;
    const newCat = {
      name: catName,
      icon: catIcon,
      type: type // add to current type
    };
    // Need a callback to add category
    onAddCategory(newCat);
    setIsAddingCategory(false);
    // Find the new category if possible, or let the user select it
  };

  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <section className="flex flex-col bg-[#161b22] border border-[#30363d] rounded-xl p-3 sm:p-4 gap-3 shrink-0">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#0d1117] rounded-lg text-emerald-500 border border-[#30363d]">
            <Repeat className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-medium text-white">{t('transactions_title') || 'Transactions'}</h2>
        </div>
        <button 
          onClick={startAdding}
          className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> {t('add_transaction') || 'Add Transaction'}
        </button>
      </div>

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
            categories={categories}
            accounts={accounts}
            cancel={cancel} 
            handleSubmit={handleSubmit} 
            onRemove={() => { if (editingId !== 'new') onRemove(editingId); cancel(); }} 
            t={t}
            currency={currency}
            lang={lang}
            onAddCategory={() => setIsAddingCategory(true)}
          />
        )}
        {isAddingCategory && (
          <CategoryForm 
            key="catForm"
            type={type}
            name={catName} setName={setCatName}
            icon={catIcon} setIcon={setCatIcon}
            cancel={() => setIsAddingCategory(false)}
            handleSubmit={handleAddCategorySubmit}
            t={t}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-0 overflow-y-auto compact-scrollbar pr-1 max-h-[500px]">
        {sortedTransactions.length === 0 ? (
          <div className="text-neutral-500 italic text-xs text-center py-4">{t('no_transactions') || 'No transactions yet'}</div>
        ) : (
          sortedTransactions.map((tx: any) => {
            const cat = categories.find((c: any) => c.id === tx.categoryId);
            const acc = accounts.find((a: any) => a.id === tx.accountId);
            const isIncome = tx.type === 'income';
            
            return (
              <div key={tx.id} className="flex items-center justify-between py-3 px-3 border-b border-[#30363d]/50 hover:bg-[#30363d]/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className={\`p-2 rounded-full \${isIncome ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}\`}>
                     {/* Simplified category icon */}
                     <span className="text-xs font-bold">{cat ? cat.name.charAt(0) : '?'}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-neutral-200 leading-tight">
                      {cat ? cat.name : 'Unknown'}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5 flex gap-2">
                      <span>{new Date(tx.date).toLocaleDateString()}</span>
                      {acc && <span>• {acc.name}</span>}
                    </p>
                    {tx.note && <p className="text-[11px] text-neutral-400 italic mt-0.5">{tx.note}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={\`font-semibold text-sm \${isIncome ? 'text-emerald-400' : 'text-neutral-300'}\`}>
                    {isIncome ? '+' : '-'}{formatMoney(tx.amount, currency, lang)}
                  </span>
                  <button onClick={() => {
                    setEditingId(tx.id);
                    setAmount(tx.amount.toString());
                    setType(tx.type);
                    setCategoryId(tx.categoryId);
                    setAccountId(tx.accountId);
                    setDate(tx.date);
                    setNote(tx.note || '');
                  }} className="text-neutral-500 hover:text-emerald-400 transition-colors p-1 bg-[#0d1117] rounded-md border border-[#30363d]">
                     <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
`;

fs.writeFileSync('transaction_components.tsx', transactionComponents);

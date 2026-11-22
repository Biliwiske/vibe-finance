const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldStart = "function AnalyticsManager({ accounts, payments, salary, goals, purchases, t, currency, lang }: any) {";
const oldEnd = "  );\n}\n\nfunction PurchaseForm({ ";

const newImpl = `function AnalyticsManager({ accounts, payments, salary, goals, purchases, transactions, categories, t, currency, lang }: any) {
  if (accounts.length === 0 && payments.length === 0 && !salary && (goals || []).length === 0 && (purchases || []).length === 0 && (transactions || []).length === 0) return null;

  const totalIncome = salary + accounts.reduce((sum: number, acc: any) => {
    if (acc.type === 'deposit' && acc.interestRate) {
      return sum + (acc.balance * (acc.interestRate / 100) / 12);
    }
    return sum;
  }, 0);

  const paymentData: any[] = payments.reduce((acc: any[], p: any) => {
    if (!p.isActive) return acc;
    let amount = p.amount;
    if (p.recurrence === 'yearly') amount = amount / 12;
    if (p.recurrence === 'weekly') amount = amount * 52 / 12;
    if (amount <= 0) return acc;
    acc.push({ name: p.name, value: amount });
    return acc;
  }, []);

  const totalExpenses = paymentData.reduce((sum: number, p: any) => sum + p.value, 0);
  
  const goalData: any[] = (goals || []).map((g: any) => ({
    name: g.name,
    value: g.monthlyContribution || 0
  })).filter((g: any) => g.value > 0);

  const totalGoalContributions = goalData.reduce((sum: number, g: any) => sum + g.value, 0);
  const freeCashFlow = Math.max(0, totalIncome - totalExpenses - totalGoalContributions);

  const inc = totalIncome || 1;
  const expPct = Math.min(100, (totalExpenses / inc) * 100);
  const goalsPct = Math.min(100, (totalGoalContributions / inc) * 100);
  const freePct = Math.min(100, (freeCashFlow / inc) * 100);

  // Accounts Dist
  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#0ea5e9', '#14b8a6'];
  const accountBalances = accounts
    .filter((a: any) => a.balance > 0 && a.type !== 'debt')
    .map((a: any) => ({ name: a.name, value: a.balance }));
    
  // Expenses Dist
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const thisMonthExpenses = (transactions || []).filter((tx: any) => {
    if (tx.type !== 'expense') return false;
    const d = new Date(tx.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  
  const expenseByCategoryMap = thisMonthExpenses.reduce((acc: any, tx: any) => {
    const cat = (categories || []).find((c: any) => c.id === tx.categoryId);
    const catName = cat ? (t(cat.name) || cat.name) : 'Unknown';
    acc[catName] = (acc[catName] || 0) + tx.amount;
    return acc;
  }, {});
  
  const expenseByCategory = Object.keys(expenseByCategoryMap)
    .map(key => ({ name: key, value: expenseByCategoryMap[key] }))
    .sort((a, b) => b.value - a.value);

  // Cashflow Trend
  const monthlyTrendMap = (transactions || []).reduce((acc: any, tx: any) => {
    const d = new Date(tx.date);
    const monthKey = \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}\`;
    if (!acc[monthKey]) acc[monthKey] = { name: monthKey, income: 0, expense: 0, date: d };
    if (tx.type === 'income') acc[monthKey].income += tx.amount;
    if (tx.type === 'expense') acc[monthKey].expense += tx.amount;
    return acc;
  }, {});
  
  const trendData = Object.keys(monthlyTrendMap)
    .sort()
    .slice(-6)
    .map(key => {
      const d = monthlyTrendMap[key].date;
      const monthName = d.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short' });
      return {
        ...monthlyTrendMap[key],
        name: monthName
      };
    });

  // Net worth
  const totalAssets = accounts.filter((a: any) => a.type !== 'debt').reduce((s: number, a: any) => s + a.balance, 0);
  const totalDebts = accounts.filter((a: any) => a.type === 'debt').reduce((s: number, a: any) => s + Math.abs(a.balance), 0);
  const netWorth = totalAssets - totalDebts;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-xl shadow-xl">
          <p className="text-sm font-medium text-neutral-200 mb-2">{label || payload[0].name}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs mb-1 last:mb-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                <span className="text-neutral-400">{entry.name}:</span>
              </div>
              <span className="font-medium text-neutral-200">{formatMoney(entry.value, currency, lang)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="flex flex-col gap-4 p-5 bg-[#161b22] border border-[#30363d] rounded-2xl">
          <div>
            <h3 className="text-sm font-medium text-neutral-200 mb-1">{t('cashflow_dist') || 'Budget Allocation'}</h3>
            <p className="text-xs text-neutral-500">{t('based_on_income') || 'Based on your monthly income'}</p>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold tabular-nums text-neutral-200">{formatMoney(totalIncome, currency, lang)}</span>
            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md uppercase tracking-wider">{t('income')}</span>
          </div>

          <div className="h-2.5 w-full bg-[#0d1117] rounded-full overflow-hidden flex shadow-inner mt-2">
            {expPct > 0 && <div style={{width: \`\${expPct}%\`}} className="bg-red-500 hover:bg-red-400 transition-colors" title={t('obligations')} />}
            {goalsPct > 0 && <div style={{width: \`\${goalsPct}%\`}} className="bg-blue-500 hover:bg-blue-400 transition-colors" title={t('tab_goals')} />}
            {freePct > 0 && <div style={{width: \`\${freePct}%\`}} className="bg-emerald-500 hover:bg-emerald-400 transition-colors" title={t('monthly_free_cash')} />}
          </div>
          <div className="flex flex-wrap items-center justify-between text-[11px] text-neutral-400 mt-2 font-medium">
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> <span className="text-neutral-300">{t('obligations')}</span> {expPct.toFixed(0)}%</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> <span className="text-neutral-300">{t('tab_goals')}</span> {goalsPct.toFixed(0)}%</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> <span className="text-neutral-300">{t('monthly_free_cash')}</span> {freePct.toFixed(0)}%</span>
          </div>
        </section>

        <section className="flex flex-col gap-4 p-5 bg-[#161b22] border border-[#30363d] rounded-2xl">
          <div>
            <h3 className="text-sm font-medium text-neutral-200 mb-1">{t('net_worth') || 'Net Worth'}</h3>
            <p className="text-xs text-neutral-500">{t('assets_vs_debts') || 'Assets vs Liabilities'}</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className={\`text-2xl font-bold tabular-nums \${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}\`}>
              {formatMoney(netWorth, currency, lang)}
            </span>
          </div>
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-400">{t('total_assets') || 'Total Assets'}</span>
              <span className="text-neutral-200 font-medium">{formatMoney(totalAssets, currency, lang)}</span>
            </div>
            <div className="h-px w-full bg-[#30363d]" />
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-400">{t('total_debts') || 'Total Debts'}</span>
              <span className="text-red-400 font-medium">{formatMoney(totalDebts, currency, lang)}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {accountBalances.length > 0 && (
          <section className="flex flex-col p-5 bg-[#161b22] border border-[#30363d] rounded-2xl min-h-[300px]">
            <h3 className="text-sm font-medium text-neutral-200 mb-2">{t('accounts_dist') || 'Accounts Distribution'}</h3>
            <div className="flex-1 w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={accountBalances}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {accountBalances.map((entry, index) => (
                      <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {expenseByCategory.length > 0 && (
          <section className="flex flex-col p-5 bg-[#161b22] border border-[#30363d] rounded-2xl min-h-[300px]">
            <h3 className="text-sm font-medium text-neutral-200 mb-2">{t('expenses_by_cat') || 'Expenses by Category (This Month)'}</h3>
            <div className="flex-1 w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={\`cell-\${index}\`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
        
        {trendData.length > 0 && (
          <section className="flex flex-col p-5 bg-[#161b22] border border-[#30363d] rounded-2xl lg:col-span-2 min-h-[350px]">
            <h3 className="text-sm font-medium text-neutral-200 mb-2">{t('cashflow_trend') || 'Cashflow Trend'}</h3>
            <div className="flex-1 w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => val >= 1000 ? \`\${(val/1000).toFixed(0)}k\` : val} 
                    width={45}
                  />
                  <Tooltip cursor={{ fill: '#30363d', opacity: 0.2 }} content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af', paddingTop: '20px' }} iconType="circle" />
                  <Bar dataKey="income" name={t('income') || 'Income'} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="expense" name={t('expenses') || 'Expenses'} fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

`;

const index = code.indexOf(oldStart);
const endIndex = code.indexOf(oldEnd);

if (index !== -1 && endIndex !== -1) {
  code = code.substring(0, index) + newImpl + code.substring(endIndex);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Success");
} else {
  console.log("Could not find block", index, endIndex);
}

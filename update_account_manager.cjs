const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// The original accounts render code block we want to replace
const startMarker = '{accounts.map((acc: Account) => {';
const endMarker = '</motion.div>\n            );\n          })}\n        </AnimatePresence>\n      </div>\n    </section>\n  );\n}';

const s = code.indexOf(startMarker);
const e = code.indexOf(endMarker) + endMarker.length;

if (s === -1 || e === -1) {
  console.log("Could not find block to replace.");
  process.exit(1);
}

const replacement = `
          {(() => {
            const cards = accounts.filter(a => a.type === 'checking' || a.type === 'cash' || !a.type);
            const savings = accounts.filter(a => a.type === 'savings' || a.type === 'deposit' || a.type === 'crypto');
            const debts = accounts.filter(a => a.type === 'debt');
            
            const renderAcc = (acc: Account) => {
              const monthlyYield = acc.interestRate ? (acc.balance * (acc.interestRate / 100) / 12) : 0;
              return calcId === acc.id ? (
                <motion.div 
                  key={\`calc-\${acc.id}\`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-3 p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-2xl overflow-hidden my-2 z-10 relative"
                >
                   <div className="flex justify-between items-center mb-1">
                     <h3 className="text-sm font-medium text-emerald-400 flex items-center gap-2"><Calculator className="w-4 h-4"/> {t('calc_title')}</h3>
                     <button onClick={cancel} className="text-xs text-neutral-500 hover:text-white transition-colors">✕</button>
                   </div>
                   <div className="flex gap-3 items-center">
                     <span className="text-sm text-neutral-400 whitespace-nowrap">{t('calc_add')}</span>
                     <input 
                       autoFocus
                       type="number" 
                       step="0.01"
                       value={calcAmount} 
                       onChange={e => setCalcAmount(e.target.value)}
                       className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 outline-none focus:border-emerald-500/50 transition-colors w-full sm:w-1/3"
                     />
                   </div>
                   {parseFloat(calcAmount) > 0 && acc.interestRate && (
                     <div className="mt-2 text-sm text-neutral-300">
                       {t('calc_profit')} <span className="font-semibold text-emerald-400">+{formatMoney(((parseFloat(calcAmount) || 0) * (acc.interestRate / 100)) / 12, currency, lang)}</span>{t('per_month')}.
                     </div>
                   )}
                </motion.div>
              ) : (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={acc.id} 
                  className="flex items-center justify-between py-2 px-3 border-b border-[#30363d]/50 hover:bg-[#30363d]/20 group transition-all cursor-pointer"
                  onClick={() => startEditing(acc)}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <AccountIcon acc={acc} />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-neutral-200 flex items-center gap-2 leading-tight">
                        {acc.name}
                        {acc.interestRate && (
                          <span className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded-sm">
                            {acc.interestRate}%
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight">
                        {t(\`type_\${acc.type || 'checking'}\` as TxKey)}
                        {monthlyYield > 0 && (
                          <span className="text-emerald-500 ml-1.5 pl-1.5 border-l border-[#30363d]">
                            +{formatMoney(monthlyYield, currency, lang)}/mo
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{formatMoney(acc.balance, currency, lang)}</span>
                    <div className="flex items-center gap-1.5">
                      {acc.interestRate && (
                        <button 
                          onClick={(e) => startCalc(acc, e)} 
                          className="text-neutral-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all bg-[#0d1117] border border-[#30363d] rounded-md p-1"
                          title={t('calc_title')}
                        >
                          <Calculator className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button className="text-neutral-500 hover:text-emerald-400 transition-colors p-1 bg-[#0d1117] rounded-md border border-[#30363d] opacity-0 group-hover:opacity-100">
                         <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            };

            return (
              <>
                {cards.length > 0 && (
                  <div className="mb-1">
                    <div className="text-[10px] font-semibold text-neutral-500 uppercase px-3 pt-2 pb-1 bg-[#161b22] sticky top-0 z-10">{t('acc_group_cards')}</div>
                    {cards.map(renderAcc)}
                  </div>
                )}
                {savings.length > 0 && (
                  <div className="mb-1">
                    <div className="text-[10px] font-semibold text-neutral-500 uppercase px-3 pt-2 pb-1 bg-[#161b22] sticky top-0 z-10">{t('acc_group_savings')}</div>
                    {savings.map(renderAcc)}
                  </div>
                )}
                {debts.length > 0 && (
                  <div className="mb-1">
                    <div className="text-[10px] font-semibold text-neutral-500 uppercase px-3 pt-2 pb-1 bg-[#161b22] sticky top-0 z-10">{t('acc_group_debts')}</div>
                    {debts.map(renderAcc)}
                  </div>
                )}
              </>
            );
          })()}
        </AnimatePresence>
      </div>
    </section>
  );
}
`;

code = code.substring(0, s) + replacement + code.substring(e);
fs.writeFileSync('src/App.tsx', code);


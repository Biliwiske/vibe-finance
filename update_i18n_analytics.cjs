const fs = require('fs');
let code = fs.readFileSync('src/i18n.ts', 'utf8');

const enInsert = `    // Analytics
    accounts_dist: "Accounts Distribution",
    expenses_by_cat: "Expenses by Category (This Month)",
    cashflow_trend: "Cashflow Trend",
    net_worth: "Net Worth",
    assets_vs_debts: "Assets vs Liabilities",
    total_assets: "Total Assets",
    total_debts: "Total Debts",
    based_on_income: "Based on your monthly income",
    income: "Income",
    expenses: "Expenses",
`;

const ruInsert = `    // Analytics
    accounts_dist: "Распределение счетов",
    expenses_by_cat: "Траты по категориям (в этом месяце)",
    cashflow_trend: "Движение средств",
    net_worth: "Чистый капитал",
    assets_vs_debts: "Активы и обязательства",
    total_assets: "Всего активов",
    total_debts: "Всего долгов",
    based_on_income: "На основе вашего ежемесячного дохода",
    income: "Доходы",
    expenses: "Расходы",
`;

code = code.replace('    tab_purchases: "Purchases",', enInsert + '    tab_purchases: "Purchases",');
code = code.replace('    tab_purchases: "Покупки",', ruInsert + '    tab_purchases: "Покупки",');

fs.writeFileSync('src/i18n.ts', code);

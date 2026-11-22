const fs = require('fs');
let code = fs.readFileSync('src/i18n.ts', 'utf8');

const newEn = `
    tab_purchases: "Purchases",
    tab_payments: "Payments",
    tab_goals: "Goals",
    cashflow_dist: "Monthly Cash Flow",
    goals_dist: "Goals Distribution",
    purchases_dist: "Purchases Distribution",
    
    // Account groups
    acc_group_cards: "Cards & Accounts",
    acc_group_savings: "Savings",
    acc_group_debts: "Debts, Credits, Installments",
    
    // Categories
    cat_salary: "Salary",
    cat_investments: "Investments",
    cat_gifts: "Gifts",
    cat_cashback: "Cashback",
    cat_other_income: "Other Income",
    
    cat_food: "Products",
    cat_cafe: "Cafe & Restaurants",
    cat_transport: "Transport",
    cat_car: "Car",
    cat_housing: "Housing",
    cat_utilities: "Utilities",
    cat_kids: "Kids",
    cat_selfcare: "Self-care",
    cat_health: "Health",
    cat_shopping: "Shopping",
    cat_education: "Education",
    cat_entertainment: "Entertainment",
    cat_subs: "Subscriptions",
    cat_travel: "Travel",
    cat_payments: "Payments & Fees",
    cat_presents: "Presents"
  },
`;

const newRu = `
    tab_purchases: "Покупки",
    tab_payments: "Платежи",
    tab_goals: "Цели",
    cashflow_dist: "Ежемесячный денежный поток",
    goals_dist: "Распределение целей",
    purchases_dist: "Распределение покупок",
    
    // Account groups
    acc_group_cards: "Карты и счета",
    acc_group_savings: "Накопления",
    acc_group_debts: "Долги, кредиты, рассрочки",
    
    // Categories
    cat_salary: "Зарплата",
    cat_investments: "Инвестиции",
    cat_gifts: "Подарки",
    cat_cashback: "Кэшбэк",
    cat_other_income: "Другое",
    
    cat_food: "Продукты",
    cat_cafe: "Кафе и рестораны",
    cat_transport: "Транспорт",
    cat_car: "Машина",
    cat_housing: "Дом, уют",
    cat_utilities: "Коммуналка",
    cat_kids: "Дети",
    cat_selfcare: "Забота о себе",
    cat_health: "Здоровье",
    cat_shopping: "Покупки",
    cat_education: "Образование",
    cat_entertainment: "Развлечения",
    cat_subs: "Подписки",
    cat_travel: "Путешествия",
    cat_payments: "Платежи, комиссии",
    cat_presents: "Подарки"
  }
`;

code = code.replace(/tab_purchases: "Purchases",[\s\S]*?purchases_dist: "Purchases Distribution"\n  },/, newEn);
code = code.replace(/tab_purchases: "Покупки",[\s\S]*?purchases_dist: "Распределение покупок"\n  }/, newRu);

// Ensure the return type in useTranslation can handle keys that might not exist in type
code = code.replace('export type TxKey = keyof typeof translations.en;', 'export type TxKey = keyof typeof translations.en | string;');
code = code.replace('return translations[lang][key] || translations.en[key] || key;', 'return (translations[lang] as any)[key] || (translations.en as any)[key] || key;');


fs.writeFileSync('src/i18n.ts', code);

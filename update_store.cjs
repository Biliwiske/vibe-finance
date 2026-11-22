const fs = require('fs');

let code = fs.readFileSync('src/hooks/useFinanceStore.ts', 'utf8');

const newDefaultCategories = `
    const defaultCategories = [
      // Income
      { id: '1', name: 'cat_salary', icon: 'Briefcase', type: 'income', color: 'emerald' },
      { id: 'inc_2', name: 'cat_investments', icon: 'Activity', type: 'income', color: 'blue' },
      { id: 'inc_3', name: 'cat_gifts', icon: 'Gift', type: 'income', color: 'pink' },
      { id: 'inc_4', name: 'cat_cashback', icon: 'Box', type: 'income', color: 'yellow' },
      { id: 'inc_5', name: 'cat_other_income', icon: 'Box', type: 'income', color: 'neutral' },
      
      // Expenses
      { id: '2', name: 'cat_food', icon: 'ShoppingBag', type: 'expense', color: 'orange' },
      { id: 'exp_2', name: 'cat_cafe', icon: 'Coffee', type: 'expense', color: 'red' },
      { id: '3', name: 'cat_transport', icon: 'Car', type: 'expense', color: 'blue' },
      { id: 'exp_4', name: 'cat_car', icon: 'Car', type: 'expense', color: 'cyan' },
      { id: '4', name: 'cat_housing', icon: 'Home', type: 'expense', color: 'purple' },
      { id: 'exp_6', name: 'cat_utilities', icon: 'Home', type: 'expense', color: 'sky' },
      { id: 'exp_7', name: 'cat_kids', icon: 'Heart', type: 'expense', color: 'yellow' },
      { id: 'exp_8', name: 'cat_selfcare', icon: 'Heart', type: 'expense', color: 'pink' },
      { id: 'exp_9', name: 'cat_health', icon: 'Activity', type: 'expense', color: 'red' },
      { id: 'exp_10', name: 'cat_shopping', icon: 'ShoppingBag', type: 'expense', color: 'green' },
      { id: 'exp_11', name: 'cat_education', icon: 'Book', type: 'expense', color: 'teal' },
      { id: 'exp_12', name: 'cat_entertainment', icon: 'Film', type: 'expense', color: 'purple' },
      { id: 'exp_13', name: 'cat_subs', icon: 'Smartphone', type: 'expense', color: 'purple' },
      { id: 'exp_14', name: 'cat_travel', icon: 'Plane', type: 'expense', color: 'sky' },
      { id: 'exp_15', name: 'cat_payments', icon: 'Box', type: 'expense', color: 'neutral' },
      { id: 'exp_16', name: 'cat_presents', icon: 'Gift', type: 'expense', color: 'green' }
    ];
    
    const saved = localStorage.getItem('vibe_categories');
    if (saved) {
      const parsed = JSON.parse(saved);
      // If user has the old minimal categories, overwrite with the rich ones
      if (parsed.length <= 4) return defaultCategories;
      return parsed;
    }
    return defaultCategories;
`;

code = code.replace(/const saved = localStorage\.getItem\('vibe_categories'\);[\s\S]*?\];/, newDefaultCategories);

fs.writeFileSync('src/hooks/useFinanceStore.ts', code);

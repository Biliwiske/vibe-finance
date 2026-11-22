const fs = require('fs');
let types = fs.readFileSync('src/types.ts', 'utf8');
if (!types.includes('color?: string;')) {
  types = types.replace('icon: string;', 'icon: string;\n  color?: string;');
  fs.writeFileSync('src/types.ts', types);
}

let store = fs.readFileSync('src/hooks/useFinanceStore.ts', 'utf8');
store = store.replace(
  "{ id: '1', name: 'Salary', icon: 'Briefcase', type: 'income' }",
  "{ id: '1', name: 'Salary', icon: 'Briefcase', type: 'income', color: 'emerald' }"
);
store = store.replace(
  "{ id: '2', name: 'Food', icon: 'ShoppingBag', type: 'expense' }",
  "{ id: '2', name: 'Food', icon: 'ShoppingBag', type: 'expense', color: 'orange' }"
);
store = store.replace(
  "{ id: '3', name: 'Transport', icon: 'Car', type: 'expense' }",
  "{ id: '3', name: 'Transport', icon: 'Car', type: 'expense', color: 'blue' }"
);
store = store.replace(
  "{ id: '4', name: 'Housing', icon: 'Home', type: 'expense' }",
  "{ id: '4', name: 'Housing', icon: 'Home', type: 'expense', color: 'purple' }"
);
fs.writeFileSync('src/hooks/useFinanceStore.ts', store);
